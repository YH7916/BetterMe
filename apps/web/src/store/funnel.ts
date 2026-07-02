import type { StepUpdate } from '@betterme/shared';
export const STEPS = ['gender', 'goal', 'body', 'frequency'] as const;
export type StepData = StepUpdate;
