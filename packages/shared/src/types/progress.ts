import type { Gender, Goal, WorkoutFrequency } from '../enums';

export interface ProgressResponse {
  assessmentId: string;
  userId: string;
  gender: Gender | null;
  primary_goal: Goal | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  workout_frequency: WorkoutFrequency | null;
  current_step: number;
  status: 'in_progress' | 'completed';
}
