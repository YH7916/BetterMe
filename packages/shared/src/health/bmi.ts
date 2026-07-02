import type { BmiCategory } from '../enums';

export function calcBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) throw new Error('height must be positive');
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}
