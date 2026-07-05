import { z } from 'zod';

export const paySchema = z.object({
  assessmentId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
});
export type PayRequest = z.infer<typeof paySchema>;
