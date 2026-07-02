import { describe, it, expect } from 'vitest';
import { calcBmi, bmiCategory, calcDailyCalories, predictTargetDate } from '../src/health';

describe('calcBmi', () => {
  it('computes BMI', () => {
    expect(calcBmi(70, 175)).toBeCloseTo(22.86, 2);
  });
  it('throws on zero height', () => {
    expect(() => calcBmi(70, 0)).toThrow();
  });
});

describe('bmiCategory', () => {
  it.each([
    [17, 'underweight'],
    [22, 'normal'],
    [27, 'overweight'],
    [32, 'obese'],
  ] as const)('bmi %d -> %s', (bmi, cat) => {
    expect(bmiCategory(bmi)).toBe(cat);
  });
  it('boundary 18.5 is normal', () => expect(bmiCategory(18.5)).toBe('normal'));
  it('boundary 25 is overweight', () => expect(bmiCategory(25)).toBe('overweight'));
});

describe('calcDailyCalories', () => {
  it('lose_weight applies a deficit vs maintain', () => {
    const base = { gender: 'male', age: 30, heightCm: 180, weightKg: 80, frequency: 'moderate' } as const;
    const maintain = calcDailyCalories({ ...base, goal: 'maintain' });
    const lose = calcDailyCalories({ ...base, goal: 'lose_weight' });
    expect(lose).toBe(maintain - 500);
  });
  it('female BMR is lower than male at same metrics', () => {
    const m = calcDailyCalories({ gender: 'male', age: 30, heightCm: 170, weightKg: 70, frequency: 'light', goal: 'maintain' });
    const f = calcDailyCalories({ gender: 'female', age: 30, heightCm: 170, weightKg: 70, frequency: 'light', goal: 'maintain' });
    expect(f).toBeLessThan(m);
  });
});

describe('predictTargetDate', () => {
  const from = new Date('2026-01-01T00:00:00Z');
  it('5kg to lose at 0.5kg/week -> 10 weeks later', () => {
    const d = predictTargetDate(75, 70, from);
    expect(d.toISOString().slice(0, 10)).toBe('2026-03-12');
  });
  it('delta 0 returns from date', () => {
    expect(predictTargetDate(70, 70, from).getTime()).toBe(from.getTime());
  });
});
