const API_BASE = (process.env.SMOKE_API_BASE ?? 'https://api.betterme.yesterhaze.codes').replace(/\/$/, '');
const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL ?? 'https://betterme.yesterhaze.codes';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 10000);
const PAID_TEST_USER_ID = process.env.PAID_TEST_USER_ID ?? '8404579c-776a-44ec-a2fe-74389b54bcc1';
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

function jsonHeaders(userId) {
  return {
    'content-type': 'application/json',
    'x-user-id': userId,
  };
}

async function checkFrontend() {
  const response = await fetchWithTimeout(FRONTEND_URL);
  const html = await response.text();
  expect(response.status === 200, `frontend returned ${response.status}`);
  expect(html.includes('<div id="root">'), 'frontend HTML does not include the React root');
}

async function checkReadiness() {
  const health = await fetchJson('/api/health');
  expect(health.status === 'ok', 'health endpoint did not return ok');

  const ready = await fetchJson('/api/ready');
  expect(ready.status === 'ok', 'ready endpoint did not return ok');
  expect(ready.checks?.database === 'ok', 'database readiness check failed');
}

async function checkAssessmentFlow() {
  const created = await fetchJson('/api/assessments', { method: 'POST' }, 201);
  expect(created.userId, 'create assessment response missing userId');
  expect(created.assessmentId, 'create assessment response missing assessmentId');

  const headers = jsonHeaders(created.userId);
  await fetchJson(`/api/assessments/${created.assessmentId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
      current_step: 4,
    }),
  });

  const submit = await fetchJson(`/api/assessments/${created.assessmentId}/submit`, {
    method: 'POST',
    headers,
  });
  expect(submit.status === 'completed', 'submit did not complete');

  const masked = await fetchJson(`/api/assessments/${created.assessmentId}/result`, { headers });
  expect(masked.member === false, 'fresh user should not be a member before pay');
  expect(masked.result?.locked === true, 'masked result should be locked');
  expect(typeof masked.result?.bmi === 'number', 'masked result missing bmi');
  expect(!('daily_calorie_intake' in masked.result), 'masked result leaked daily_calorie_intake');
  expect(!('target_date' in masked.result), 'masked result leaked target_date');

  const pay = await fetchJson('/api/pay', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: created.userId, assessmentId: created.assessmentId }),
  });
  expect(pay.status === 'active', 'pay did not activate subscription');

  const full = await fetchJson(`/api/assessments/${created.assessmentId}/result`, { headers });
  expect(full.member === true, 'paid user should be a member');
  expect(typeof full.result?.daily_calorie_intake === 'number', 'full result missing daily_calorie_intake');
  expect(typeof full.result?.target_date === 'string', 'full result missing target_date');
  expect(full.result?.algorithm_version === 'v1', 'full result missing algorithm version');
}

async function checkSeededPaidSession() {
  const result = await fetchJson(`/api/assessments/${PAID_TEST_ASSESSMENT_ID}/result`, {
    headers: { 'x-user-id': PAID_TEST_USER_ID },
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
