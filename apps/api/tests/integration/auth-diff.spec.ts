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
async function completed() {
  const { token, assessmentId } = await (await app.request('/api/v1/assessments', { method: 'POST' })).json();
  await app.request(`/api/v1/assessments/${assessmentId}`, { method: 'PATCH', headers: h(token), body: JSON.stringify({ gender: 'female', primary_goal: 'lose_weight', age: 28, height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light', current_step: 4 }) });
  await app.request(`/api/v1/assessments/${assessmentId}/submit`, { method: 'POST', headers: h(token) });
  return { token, assessmentId };
}

describe('differentiated result & pay unlock', () => {
  beforeEach(resetDb);

  it('non-member gets masked result (no protected fields)', async () => {
    const { token, assessmentId } = await completed();
    const res = await app.request(`/api/v1/assessments/${assessmentId}/result`, { headers: h(token) });
    const body = await res.json();
    expect(body.member).toBe(false);
    expect(body.result.bmi).toBeDefined();
    expect(body.result).not.toHaveProperty('daily_calorie_intake');
    expect(body.result).not.toHaveProperty('target_date');
    expect(body.result.locked).toBe(true);
    expect(typeof body.result.message).toBe('string');
  });

  it('after /pay the same result becomes full', async () => {
    const { token, assessmentId } = await completed();
    const pay = await app.request('/api/v1/pay', { method: 'POST', headers: h(token), body: JSON.stringify({ assessmentId }) });
    expect(pay.status).toBe(200);
    const payBody = await pay.json();
    expect(payBody.payment).toMatchObject({
      provider: 'mock',
      status: 'succeeded',
      amount_cents: 1900,
      currency: 'CNY',
    });
    const res = await app.request(`/api/v1/assessments/${assessmentId}/result`, { headers: h(token) });
    const body = await res.json();
    expect(body.member).toBe(true);
    expect(body.result.daily_calorie_intake).toBeGreaterThan(0);
    expect(body.result.target_date).toBeDefined();
    expect(body.result.locked).toBeUndefined();
    expect(body.result.algorithm_version).toBeDefined();
  });

  it('keeps repeated pay calls idempotent for the same user', async () => {
    const { token, assessmentId } = await completed();

    const first = await app.request('/api/v1/pay', { method: 'POST', headers: h(token), body: JSON.stringify({ assessmentId }) });
    expect(first.status).toBe(200);
    const owner = await prisma.session.findFirstOrThrow({ where: { token }, select: { userId: true } });
    const firstSubscription = await prisma.subscription.findUniqueOrThrow({ where: { userId: owner.userId } });

    const second = await app.request('/api/v1/pay', { method: 'POST', headers: h(token), body: JSON.stringify({ assessmentId }) });
    expect(second.status).toBe(200);
    const secondSubscription = await prisma.subscription.findUniqueOrThrow({ where: { userId: owner.userId } });

    expect(secondSubscription.status).toBe('active');
    expect(secondSubscription.paymentRef).toBe(firstSubscription.paymentRef);
    expect(secondSubscription.activatedAt?.getTime()).toBe(firstSubscription.activatedAt?.getTime());
  });

  it('stores one idempotent mock payment record per checkout attempt', async () => {
    const { token, assessmentId } = await completed();
    const payload = { assessmentId, idempotencyKey: 'checkout_attempt_1' };

    const first = await app.request('/api/v1/pay', { method: 'POST', headers: h(token), body: JSON.stringify(payload) });
    const firstBody = await first.json();
    const second = await app.request('/api/v1/pay', { method: 'POST', headers: h(token), body: JSON.stringify(payload) });
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.payment.id).toBe(firstBody.payment.id);
    expect(secondBody.payment.provider_ref).toBe(firstBody.payment.provider_ref);

    const owner = await prisma.session.findFirstOrThrow({ where: { token }, select: { userId: true } });
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "payments"
      WHERE "user_id" = ${owner.userId} AND "assessment_id" = ${assessmentId}
    `;
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  it('does not create a second charge when the subscription is already active', async () => {
    const { token, assessmentId } = await completed();
    await app.request('/api/v1/pay', {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ assessmentId, idempotencyKey: 'first_checkout' }),
    });

    const second = await app.request('/api/v1/pay', {
      method: 'POST', headers: h(token),
      body: JSON.stringify({ assessmentId, idempotencyKey: 'second_checkout' }),
    });
    const secondBody = await second.json();

    expect(secondBody.status).toBe('active');
    const owner = await prisma.session.findFirstOrThrow({ where: { token }, select: { userId: true } });
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "payments"
      WHERE "user_id" = ${owner.userId} AND "assessment_id" = ${assessmentId}
    `;
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  it('rejects paying without a token (401)', async () => {
    const { assessmentId } = await completed();
    const res = await app.request('/api/v1/pay', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assessmentId }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects paying for an assessment owned by another user (403)', async () => {
    const caller = await completed();
    const other = await completed();
    const res = await app.request('/api/v1/pay', {
      method: 'POST', headers: h(caller.token),
      body: JSON.stringify({ assessmentId: other.assessmentId }),
    });
    expect(res.status).toBe(403);
  });
});
