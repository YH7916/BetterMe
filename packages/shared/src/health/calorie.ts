import type { Gender, Goal, WorkoutFrequency } from '../enums';

const ACTIVITY: Record<WorkoutFrequency, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
};
const GOAL_ADJUST: Record<Goal, number> = {
  lose_weight: -500, gain_muscle: 500, maintain: 0,
};

export function calcDailyCalories(input: {
  gender: Gender; age: number; heightCm: number; weightKg: number;
  frequency: WorkoutFrequency; goal: Goal;
}): number {
  const { gender, age, heightCm, weightKg, frequency, goal } = input;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY[frequency];
  return Math.round(tdee + GOAL_ADJUST[goal]);
}
