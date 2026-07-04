import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createApp } from '../../src/app';

const app = createApp();
async function resetDb() {
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}
async function start() {
  const res = await app.request('/api/assessments', { method: 'POST' });
  return res.json() as Promise<{ userId: string; assessmentId: string; currentStep: number }>;
}
const h = (userId: string) => ({ 'x-user-id': userId, 'content-type': 'application/json' });

describe('assessment persistence & recovery', () => {
  beforeEach(resetDb);

  it('creates an assessment with step 0', async () => {
    const { assessmentId, currentStep } = await start();
    expect(assessmentId).toBeTruthy();
    expect(currentStep).toBe(0);
  });

  it('saves a step and recovers progress', async () => {
    const { userId, assessmentId } = await start();
    await app.request(`/api/assessments/${assessmentId}`, {
      method: 'PATCH', headers: h(userId),
      body: JSON.stringify({ gender: 'male', current_step: 1 }),
    });
    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h(userId) });
    const body = await res.json();
    expect(body.gender).toBe('male');
    expect(body.current_step).toBe(1);
  });

  it('handles out-of-order and duplicate submits idempotently', async () => {
    const { userId, assessmentId } = await start();
    const patch = (b: object) => app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify(b) });
    await patch({ age: 30, current_step: 2 });
    await patch({ gender: 'female', current_step: 1 }); // out of order
    await patch({ age: 30, current_step: 2 }); // duplicate
    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h(userId) });
    const body = await res.json();
    expect(body.age).toBe(30);
    expect(body.gender).toBe('female');
    expect(body.current_step).toBe(2);
  });

  it('does not regress current_step when a stale save arrives later', async () => {
    const { userId, assessmentId } = await start();
    const patch = (b: object) => app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify(b) });
    await patch({ gender: 'female', current_step: 3 });
    await patch({ age: 30, current_step: 1 });

    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h(userId) });
    const body = await res.json();
    expect(body.gender).toBe('female');
    expect(body.age).toBe(30);
    expect(body.current_step).toBe(3);
  });

  it('merges concurrent updates without regressing current_step', async () => {
    const { userId, assessmentId } = await start();
    const patch = (b: object) => app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify(b) });

    await Promise.all([
      patch({ gender: 'female', current_step: 4 }),
      patch({ age: 30, current_step: 13 }),
      patch({ height_cm: 165, workout_frequency: 'light', current_step: 8 }),
      patch({ weight_kg: 70, target_weight_kg: 75, current_step: 11 }),
    ]);

    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h(userId) });
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
    const { userId, assessmentId } = await start();
    const res = await app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify({ height_cm: 10 }) });
    expect(res.status).toBe(400);
  });

  it('blocks cross-user access (403)', async () => {
    const { assessmentId } = await start();
    const res = await app.request(`/api/assessments/${assessmentId}`, { headers: h('00000000-0000-0000-0000-000000000000') });
    expect(res.status).toBe(403);
  });

  it('blocks access when x-user-id header is absent (403)', async () => {
    const { assessmentId } = await start();
    const res = await app.request(`/api/assessments/${assessmentId}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for a nonexistent assessment', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    const res = await app.request(`/api/assessments/${id}`, { headers: h(id) });
    expect(res.status).toBe(404);
  });
});
