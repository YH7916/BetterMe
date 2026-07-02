import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { createApp } from '../../src/app';

const app = createApp();
const h = (u: string) => ({ 'x-user-id': u, 'content-type': 'application/json' });
async function resetDb() {
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}
async function fullAssessment() {
  const { userId, assessmentId } = await (await app.request('/api/assessments', { method: 'POST' })).json();
  await app.request(`/api/assessments/${assessmentId}`, {
    method: 'PATCH', headers: h(userId),
    body: JSON.stringify({ gender: 'female', primary_goal: 'lose_weight', age: 28, height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light', current_step: 4 }),
  });
  return { userId, assessmentId };
}

describe('submit', () => {
  beforeEach(resetDb);
  it('computes and persists a result', async () => {
    const { userId, assessmentId } = await fullAssessment();
    const res = await app.request(`/api/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(userId) });
    expect(res.status).toBe(200);
    const stored = await prisma.assessmentResult.findUnique({ where: { assessmentId } });
    expect(stored).not.toBeNull();
    expect(Number(stored!.bmi)).toBeCloseTo(25.71, 1);
    expect(stored!.bmiCategory).toBe('overweight');
  });
  it('rejects submit with incomplete data (400)', async () => {
    const { userId, assessmentId } = await (async () => {
      const j = await (await app.request('/api/assessments', { method: 'POST' })).json();
      await app.request(`/api/assessments/${j.assessmentId}`, { method: 'PATCH', headers: h(j.userId), body: JSON.stringify({ gender: 'male', current_step: 1 }) });
      return j;
    })();
    const res = await app.request(`/api/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(userId) });
    expect(res.status).toBe(400);
  });
});
