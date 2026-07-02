import { z } from 'zod';
import { GENDERS, GOALS, WORKOUT_FREQUENCIES } from '../enums';

const age = z.number().int().min(13).max(120);
const height_cm = z.number().min(50).max(260);
const weight_kg = z.number().min(20).max(500);
const target_weight_kg = z.number().min(20).max(500);

export const stepUpdateSchema = z
  .object({
    gender: z.enum(GENDERS),
    primary_goal: z.enum(GOALS),
    age,
    height_cm,
    weight_kg,
    target_weight_kg,
    workout_frequency: z.enum(WORKOUT_FREQUENCIES),
    current_step: z.number().int().min(0).max(10),
  })
  .partial()
  .strict();

export const submitSchema = z.object({
  gender: z.enum(GENDERS),
  primary_goal: z.enum(GOALS),
  age,
  height_cm,
  weight_kg,
  target_weight_kg,
  workout_frequency: z.enum(WORKOUT_FREQUENCIES),
}).strict();

export type StepUpdate = z.infer<typeof stepUpdateSchema>;
export type AssessmentInput = z.infer<typeof submitSchema>;
