export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

export const GOALS = ['lose_weight', 'gain_muscle', 'maintain'] as const;
export type Goal = (typeof GOALS)[number];

export const WORKOUT_FREQUENCIES = ['sedentary', 'light', 'moderate', 'active'] as const;
export type WorkoutFrequency = (typeof WORKOUT_FREQUENCIES)[number];

export const BMI_CATEGORIES = ['underweight', 'normal', 'overweight', 'obese'] as const;
export type BmiCategory = (typeof BMI_CATEGORIES)[number];
