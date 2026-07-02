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
async function completed() {
  const { userId, assessmentId } = await (await app.request('/api/assessments', { method: 'POST' })).json();
  await app.request(`/api/assessments/${assessmentId}`, { method: 'PATCH', headers: h(userId), body: JSON.stringify({ gender: 'female', primary_goal: 'lose_weight', age: 28, height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light', current_step: 4 }) });
  await app.request(`/api/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(userId) });
  return { userId, assessmentId };
}

describe('differentiated result & pay unlock', () => {
  beforeEach(resetDb);

  it('non-member gets masked result (no protected fields)', async () => {
    const { userId, assessmentId } = await completed();
    const res = await app.request(`/api/assessments/${assessmentId}/result`, { headers: h(userId) });
    const body = await res.json();
    expect(body.member).toBe(false);
    expect(body.result.bmi).toBeDefined();
    expect(body.result).not.toHaveProperty('daily_calorie_intake');
    expect(body.result).not.toHaveProperty('target_date');
    expect(body.result.locked).toBe(true);
    expect(typeof body.result.message).toBe('string');
  });

  it('after /pay the same result becomes full', async () => {
    const { userId, assessmentId } = await completed();
    const pay = await app.request('/api/pay', { method: 'POST', headers: h(userId), body: JSON.stringify({ userId, assessmentId }) });
    expect(pay.status).toBe(200);
    const res = await app.request(`/api/assessments/${assessmentId}/result`, { headers: h(userId) });
    const body = await res.json();
    expect(body.member).toBe(true);
    expect(body.result.daily_calorie_intake).toBeGreaterThan(0);
    expect(body.result.target_date).toBeDefined();
    expect(body.result.locked).toBeUndefined();
    expect(body.result.algorithm_version).toBeDefined();
  });

  it('rejects paying for another user (403)', async () => {
    const { userId, assessmentId } = await completed();
    const res = await app.request('/api/pay', {
      method: 'POST',
      headers: h(userId),
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000', assessmentId }),
    });
    expect(res.status).toBe(403);
  });
});
