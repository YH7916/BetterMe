import { z } from 'zod';
import { GENDERS, GOALS, WORKOUT_FREQUENCIES } from '../enums';

const age = z.number().int().min(13).max(120);
const height_cm = z.number().min(50).max(260);
const weight_kg = z.number().min(20).max(500);
const target_weight_kg = z.number().min(20).max(500);

const assessmentShape = {
  gender: z.enum(GENDERS),
  primary_goal: z.enum(GOALS),
  age,
  height_cm,
  weight_kg,
  target_weight_kg,
  workout_frequency: z.enum(WORKOUT_FREQUENCIES),
  current_step: z.number().int().min(0).max(10),
};

function validateTargetDirection(
  data: Partial<Pick<z.infer<z.ZodObject<typeof assessmentShape>>, 'primary_goal' | 'weight_kg' | 'target_weight_kg'>>,
  ctx: z.RefinementCtx,
) {
  if (data.primary_goal === undefined || data.weight_kg === undefined || data.target_weight_kg === undefined) {
    return;
  }
  if (data.primary_goal === 'lose_weight' && data.target_weight_kg >= data.weight_kg) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_weight_kg'], message: 'target weight must be below current weight for lose_weight' });
  }
  if (data.primary_goal === 'gain_muscle' && data.target_weight_kg <= data.weight_kg) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_weight_kg'], message: 'target weight must be above current weight for gain_muscle' });
  }
}

export const stepUpdateSchema = z
  .object(assessmentShape)
  .partial()
  .strict()
  .superRefine(validateTargetDirection);

export const submitSchema = z
  .object({
    gender: assessmentShape.gender,
    primary_goal: assessmentShape.primary_goal,
    age: assessmentShape.age,
    height_cm: assessmentShape.height_cm,
    weight_kg: assessmentShape.weight_kg,
    target_weight_kg: assessmentShape.target_weight_kg,
    workout_frequency: assessmentShape.workout_frequency,
  })
  .strict()
  .superRefine(validateTargetDirection);

export type StepUpdate = z.infer<typeof stepUpdateSchema>;
export type AssessmentInput = z.infer<typeof submitSchema>;
