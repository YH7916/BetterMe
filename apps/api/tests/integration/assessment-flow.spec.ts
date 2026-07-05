import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createApp } from '../../src/app';

const app = createApp();
async function resetDb() {
  await prisma.payment.deleteMany();
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
async function start() {
  const res = await app.request('/api/v1/assessments', { method: 'POST' });
  return res.json() as Promise<{ token: string; assessmentId: string; currentStep: number }>;
}
const h = (token: string) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });

describe('assessment persistence & recovery', () => {
  beforeEach(resetDb);

  it('creates an assessment with a token and step 0', async () => {
    const { token, assessmentId, currentStep } = await start();
    expect(token).toBeTruthy();
    expect(assessmentId).toBeTruthy();
    expect(currentStep).toBe(0);
  });

  it('does not leak userId in the create response', async () => {
    const body = await start();
    expect(body).not.toHaveProperty('userId');
  });

  it('saves a step and recovers progress', async () => {
    const { token, assessmentId } = await start();
    await app.request(`/api/v1/assessments/${assessmentId}`, {
      method: 'PATCH', headers: h(token),
      body: JSON.stringify({ gender: 'male', current_step: 1 }),
    });
    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h(token) });
    const body = await res.json();
    expect(body.gender).toBe('male');
    expect(body.current_step).toBe(1);
    expect(body).not.toHaveProperty('userId');
  });

  it('handles out-of-order and duplicate submits idempotently', async () => {
    const { token, assessmentId } = await start();
    const patch = (b: object) => app.request(`/api/v1/assessments/${assessmentId}`, { method: 'PATCH', headers: h(token), body: JSON.stringify(b) });
    await patch({ age: 30, current_step: 2 });
    await patch({ gender: 'female', current_step: 1 }); // out of order
    await patch({ age: 30, current_step: 2 }); // duplicate
    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h(token) });
    const body = await res.json();
    expect(body.age).toBe(30);
    expect(body.gender).toBe('female');
    expect(body.current_step).toBe(2);
  });

  it('does not regress current_step when a stale save arrives later', async () => {
    const { token, assessmentId } = await start();
    const patch = (b: object) => app.request(`/api/v1/assessments/${assessmentId}`, { method: 'PATCH', headers: h(token), body: JSON.stringify(b) });
    await patch({ gender: 'female', current_step: 3 });
    await patch({ age: 30, current_step: 1 });

    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h(token) });
    const body = await res.json();
    expect(body.gender).toBe('female');
    expect(body.age).toBe(30);
    expect(body.current_step).toBe(3);
  });

  it('merges concurrent updates without regressing current_step', async () => {
    const { token, assessmentId } = await start();
    const patch = (b: object) => app.request(`/api/v1/assessments/${assessmentId}`, { method: 'PATCH', headers: h(token), body: JSON.stringify(b) });

    await Promise.all([
      patch({ gender: 'female', current_step: 4 }),
      patch({ age: 30, current_step: 13 }),
      patch({ height_cm: 165, workout_frequency: 'light', current_step: 8 }),
      patch({ weight_kg: 70, target_weight_kg: 75, current_step: 11 }),
    ]);

    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h(token) });
    const body = await res.json();
    expect(body.gender).toBe('female');
    expect(body.age).toBe(30);
    expect(body.height_cm).toBe(165);
    expect(body.weight_kg).toBe(70);
    expect(body.target_weight_kg).toBe(75);
    expect(body.workout_frequency).toBe('light');
    expect(body.current_step).toBe(13);
  });

  it('rejects invalid values (400)', async () => {
    const { token, assessmentId } = await start();
    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { method: 'PATCH', headers: h(token), body: JSON.stringify({ height_cm: 10 }) });
    expect(res.status).toBe(400);
  });

  it('returns every validation error, not just the first', async () => {
    const { token, assessmentId } = await start();
    const res = await app.request(`/api/v1/assessments/${assessmentId}`, {
      method: 'PATCH', headers: h(token), body: JSON.stringify({ height_cm: 10, weight_kg: 5, age: 2 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.fields)).toBe(true);
    expect(body.error.fields.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects a missing bearer token (401)', async () => {
    const { assessmentId } = await start();
    const res = await app.request(`/api/v1/assessments/${assessmentId}`);
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token (401)', async () => {
    const { assessmentId } = await start();
    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h('not-a-real-token') });
    expect(res.status).toBe(401);
  });

  it('rejects an expired token (401)', async () => {
    const { token, assessmentId } = await start();
    const session = await prisma.session.findFirstOrThrow({ where: { token }, select: { userId: true } });
    await prisma.session.create({ data: { token: 'expired-token', userId: session.userId, expiresAt: new Date(Date.now() - 1000) } });
    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h('expired-token') });
    expect(res.status).toBe(401);
  });

  it('blocks cross-user access with a valid but foreign token (403)', async () => {
    const { assessmentId } = await start();
    const intruder = await start();
    const res = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h(intruder.token) });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a nonexistent assessment', async () => {
    const { token } = await start();
    const res = await app.request(`/api/v1/assessments/00000000-0000-0000-0000-000000000000`, { headers: h(token) });
    expect(res.status).toBe(404);
  });

  it('deletes an assessment and its derived data (GDPR)', async () => {
    const { token, assessmentId } = await start();
    const del = await app.request(`/api/v1/assessments/${assessmentId}`, { method: 'DELETE', headers: h(token) });
    expect(del.status).toBe(204);
    const after = await app.request(`/api/v1/assessments/${assessmentId}`, { headers: h(token) });
    expect(after.status).toBe(404);
    expect(await prisma.assessment.findUnique({ where: { id: assessmentId } })).toBeNull();
  });
});
