import { describe, it, expect } from 'vitest';
import { paySchema, stepUpdateSchema, submitSchema } from '../src/index';

describe('stepUpdateSchema', () => {
  it('accepts a valid partial step', () => {
    const r = stepUpdateSchema.safeParse({ gender: 'male', age: 30 });
    expect(r.success).toBe(true);
  });
  it('rejects out-of-range height', () => {
    expect(stepUpdateSchema.safeParse({ height_cm: 10 }).success).toBe(false);
    expect(stepUpdateSchema.safeParse({ height_cm: 300 }).success).toBe(false);
  });
  it('rejects string masquerading as number', () => {
    expect(stepUpdateSchema.safeParse({ age: '30' as unknown as number }).success).toBe(false);
  });
  it('rejects unknown enum', () => {
    expect(stepUpdateSchema.safeParse({ gender: 'x' }).success).toBe(false);
  });
  it('rejects unknown keys', () => {
    expect(stepUpdateSchema.safeParse({ unknownField: 'x' }).success).toBe(false);
  });
  it.each([
    ['age', 12], ['age', 121],
    ['weight_kg', 19], ['weight_kg', 501],
    ['target_weight_kg', 19], ['target_weight_kg', 501],
  ])('rejects out-of-range %s = %d', (field, value) => {
    expect(stepUpdateSchema.safeParse({ [field]: value }).success).toBe(false);
  });
  it('accepts current_step values from the longer questionnaire flow', () => {
    expect(stepUpdateSchema.safeParse({ current_step: 13 }).success).toBe(true);
  });
});

describe('submitSchema', () => {
  it('requires all fields', () => {
    expect(submitSchema.safeParse({ gender: 'male' }).success).toBe(false);
  });
  it('accepts a complete valid payload', () => {
    const r = submitSchema.safeParse({
      gender: 'female', primary_goal: 'lose_weight', age: 28,
      height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light',
    });
    expect(r.success).toBe(true);
  });
  it('rejects unknown keys', () => {
    expect(submitSchema.safeParse({
      gender: 'female', primary_goal: 'lose_weight', age: 28,
      height_cm: 165, weight_kg: 70, target_weight_kg: 60, workout_frequency: 'light',
      unknownField: 'x',
    }).success).toBe(false);
  });
  it.each([
    ['lose_weight', 70, 75],
    ['gain_muscle', 70, 65],
    ['maintain', 70, 70],
  ] as const)('allows target weight in either direction for %s', (primary_goal, weight_kg, target_weight_kg) => {
    const r = submitSchema.safeParse({
      gender: 'female', primary_goal, age: 28,
      height_cm: 165, weight_kg, target_weight_kg, workout_frequency: 'light',
    });
    expect(r.success).toBe(true);
  });
});

describe('paySchema', () => {
  it('accepts an optional idempotency key for a checkout attempt', () => {
    const r = paySchema.safeParse({
      userId: '8404579c-776a-44ec-a2fe-74389b54bcc1',
      assessmentId: 'ef0e9e76-0322-45af-89cc-f4b785c7b264',
      idempotencyKey: 'checkout_attempt_1',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty idempotency keys', () => {
    const r = paySchema.safeParse({
      userId: '8404579c-776a-44ec-a2fe-74389b54bcc1',
      assessmentId: 'ef0e9e76-0322-45af-89cc-f4b785c7b264',
      idempotencyKey: '',
    });
    expect(r.success).toBe(false);
  });
});
