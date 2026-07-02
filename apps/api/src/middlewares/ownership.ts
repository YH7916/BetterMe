import type { Context, Next } from 'hono';
import { AppError } from '../lib/errors';
import { assessmentRepo } from '../repositories/assessment.repository';
import type { AppVariables } from '../app';

export async function requireOwnership(c: Context<{ Variables: AppVariables }>, next: Next) {
  const id = c.req.param('id') ?? '';
  const userId = c.req.header('x-user-id');
  const a = await assessmentRepo.findById(id);
  if (!a) throw AppError.notFound('assessment not found');
  if (!userId || a.userId !== userId) throw AppError.forbidden('not your assessment');
  c.set('assessment', a);
  await next();
}
