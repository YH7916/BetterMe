import { describe, it, expect } from 'vitest';
import { stepUpdateSchema, submitSchema } from '../src/index';

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
});
