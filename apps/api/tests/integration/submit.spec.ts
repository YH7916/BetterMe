import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createApp } from '../../src/app';

const app = createApp();
const h = (token: string) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
async function resetDb() {
  await prisma.payment.deleteMany();
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
async function start() {
  return (await app.request('/api/v1/assessments', { method: 'POST' })).json() as Promise<{ token: string; assessmentId: string }>;
}
async function fullAssessment() {
  const { token, assessmentId } = await start();
  await app.request(`/api/v1/assessments/${assessmentId}`, {
    method: 'PATCH', headers: h(token),
    body: JSON.stringify({ gender: 'female', primary_goal: 'lose_weight', age: 28, height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light', current_step: 4 }),
  });
  return { token, assessmentId };
}

describe('submit', () => {
  beforeEach(resetDb);
  it('computes and persists a result', async () => {
    const { token, assessmentId } = await fullAssessment();
    const res = await app.request(`/api/v1/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(token) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('completed');
    const stored = await prisma.assessmentResult.findUnique({ where: { assessmentId } });
    expect(stored).not.toBeNull();
    expect(Number(stored!.bmi)).toBeCloseTo(25.71, 1);
    expect(stored!.bmiCategory).toBe('overweight');
    expect(Number(stored!.bmi)).toBeCloseTo(25.71, 2);
    expect(stored!.dailyCalorieIntake).toBeGreaterThan(0);
    expect(stored!.algorithmVersion).toBe('v1');
    expect(stored!.targetDate).toBeInstanceOf(Date);
  });
  it('is idempotent on re-submit (no duplicate result row)', async () => {
    const { token, assessmentId } = await fullAssessment();
    await app.request(`/api/v1/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(token) });
    const res2 = await app.request(`/api/v1/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(token) });
    expect(res2.status).toBe(200);
    const rows = await prisma.assessmentResult.findMany({ where: { assessmentId } });
    expect(rows).toHaveLength(1);
  });
  it('rejects submit with incomplete data (400)', async () => {
    const { token, assessmentId } = await start();
    await app.request(`/api/v1/assessments/${assessmentId}`, { method: 'PATCH', headers: h(token), body: JSON.stringify({ gender: 'male', current_step: 1 }) });
    const res = await app.request(`/api/v1/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(token) });
    expect(res.status).toBe(400);
  });
  it('allows submit when target weight is above the current weight', async () => {
    const { token, assessmentId } = await start();
    await app.request(`/api/v1/assessments/${assessmentId}`, {
      method: 'PATCH', headers: h(token),
      body: JSON.stringify({ gender: 'female', primary_goal: 'lose_weight', age: 28, height_cm: 165, weight_kg: 70, current_step: 3 }),
    });
    await app.request(`/api/v1/assessments/${assessmentId}`, {
      method: 'PATCH', headers: h(token),
      body: JSON.stringify({ target_weight_kg: 75, workout_frequency: 'light', current_step: 4 }),
    });

    const res = await app.request(`/api/v1/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(token) });
    expect(res.status).toBe(200);
  });
});
