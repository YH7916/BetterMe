const API_BASE = (process.env.SMOKE_API_BASE ?? 'https://api.betterme.yesterhaze.codes').replace(/\/$/, '');
const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL ?? 'https://betterme.yesterhaze.codes';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 10000);
const PAID_TEST_TOKEN = process.env.PAID_TEST_TOKEN ?? 'seed-demo-token-0000000000000000000000000000000000000000000000000000000000000000';
const PAID_TEST_ASSESSMENT_ID = process.env.PAID_TEST_ASSESSMENT_ID ?? 'ef0e9e76-0322-45af-89cc-f4b785c7b264';

const startedAt = Date.now();
const steps = [];

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function withStep(name, fn) {
  const stepStartedAt = Date.now();
  await fn();
  steps.push({ name, latency_ms: Date.now() - stepStartedAt });
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(path, options = {}, expectedStatus = 200) {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${path} returned non-JSON body: ${text.slice(0, 120)}`);
  }
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}, expected ${expectedStatus}: ${text.slice(0, 240)}`);
  }
  return body;
}

function jsonHeaders(token) {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
}

async function checkFrontend() {
  const response = await fetchWithTimeout(FRONTEND_URL);
  const html = await response.text();
  expect(response.status === 200, `frontend returned ${response.status}`);
  expect(html.includes('<div id="root">'), 'frontend HTML does not include the React root');

  const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => {
    const src = match[1];
    return src.startsWith('http') ? src : new URL(src, FRONTEND_URL).toString();
  });

  if (scriptUrls.length > 0) {
    const scripts = await Promise.all(scriptUrls.map(async (url) => {
      const script = await fetchWithTimeout(url);
      expect(script.status === 200, `frontend script ${url} returned ${script.status}`);
      return script.text();
    }));
    const bundle = scripts.join('\n');
    expect(bundle.includes('你平时喜欢普拉提吗'), 'frontend bundle does not include the new 5-stage funnel copy');
    expect(bundle.includes('完整报告付费确认'), 'frontend bundle does not include the dedicated pay page');
    expect(!bundle.includes('模拟解锁会员'), 'frontend bundle still includes the old direct unlock flow');
  }
}

async function checkReadiness() {
  const health = await fetchJson('/api/health');
  expect(health.status === 'ok', 'health endpoint did not return ok');

  const ready = await fetchJson('/api/ready');
  expect(ready.status === 'ok', 'ready endpoint did not return ok');
  expect(ready.checks?.database === 'ok', 'database readiness check failed');
}

async function checkAssessmentFlow() {
  const created = await fetchJson('/api/v1/assessments', { method: 'POST' }, 201);
  expect(created.token, 'create assessment response missing token');
  expect(created.assessmentId, 'create assessment response missing assessmentId');

  const headers = jsonHeaders(created.token);
  await fetchJson(`/api/v1/assessments/${created.assessmentId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 75,
      workout_frequency: 'light',
      current_step: 13,
    }),
  }).then((patched) => {
    expect(patched.current_step >= 13, 'current_step did not persist the longer funnel index');
    expect(Number(patched.target_weight_kg) === 75, 'target weight above current weight was not persisted');
  });

  const submit = await fetchJson(`/api/v1/assessments/${created.assessmentId}/submit`, {
    method: 'POST',
    headers,
  });
  expect(submit.status === 'completed', 'submit did not complete');

  const masked = await fetchJson(`/api/v1/assessments/${created.assessmentId}/result`, { headers });
  expect(masked.member === false, 'fresh user should not be a member before pay');
  expect(masked.result?.locked === true, 'masked result should be locked');
  expect(typeof masked.result?.bmi === 'number', 'masked result missing bmi');
  expect(!('daily_calorie_intake' in masked.result), 'masked result leaked daily_calorie_intake');
  expect(!('target_date' in masked.result), 'masked result leaked target_date');

  const pay = await fetchJson('/api/v1/pay', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      assessmentId: created.assessmentId,
      idempotencyKey: `smoke-${created.assessmentId}`,
    }),
  });
  expect(pay.status === 'active', 'pay did not activate subscription');
  expect(pay.payment?.provider === 'mock', 'pay did not return mock provider metadata');
  expect(pay.payment?.status === 'succeeded', 'pay did not record a succeeded payment');
  expect(pay.payment?.amount_cents === 1900, 'pay did not return expected amount');
  expect(pay.payment?.currency === 'CNY', 'pay did not return expected currency');

  const full = await fetchJson(`/api/v1/assessments/${created.assessmentId}/result`, { headers });
  expect(full.member === true, 'paid user should be a member');
  expect(typeof full.result?.daily_calorie_intake === 'number', 'full result missing daily_calorie_intake');
  expect(typeof full.result?.target_date === 'string', 'full result missing target_date');
  expect(full.result?.algorithm_version === 'v1', 'full result missing algorithm version');

  // GDPR delete: the smoke user cleans up after itself.
  await fetchJson(`/api/v1/assessments/${created.assessmentId}`, { method: 'DELETE', headers }, 204);
}

async function checkSeededPaidSession() {
  const result = await fetchJson(`/api/v1/assessments/${PAID_TEST_ASSESSMENT_ID}/result`, {
    headers: jsonHeaders(PAID_TEST_TOKEN),
  });
  expect(result.member === true, 'seeded paid session should be a member');
  expect(typeof result.result?.daily_calorie_intake === 'number', 'seeded paid session missing daily calories');
  expect(typeof result.result?.target_date === 'string', 'seeded paid session missing target date');
}

async function main() {
  await withStep('frontend', checkFrontend);
  await withStep('api-readiness', checkReadiness);
  await withStep('assessment-flow', checkAssessmentFlow);
  await withStep('seeded-paid-session', checkSeededPaidSession);

  console.log(JSON.stringify({
    status: 'ok',
    api_base: API_BASE,
    frontend_url: FRONTEND_URL,
    total_latency_ms: Date.now() - startedAt,
    steps,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: 'error',
    api_base: API_BASE,
    frontend_url: FRONTEND_URL,
    message: error instanceof Error ? error.message : String(error),
    steps,
  }, null, 2));
  process.exit(1);
});
