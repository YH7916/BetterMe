import { z } from 'zod';

export const paySchema = z.object({
  userId: z.string().uuid(),
  assessmentId: z.string().uuid(),
});
export type PayRequest = z.infer<typeof paySchema>;
