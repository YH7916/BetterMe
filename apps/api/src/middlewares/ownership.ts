import type { Context, Next } from 'hono';
import { AppError } from '../lib/errors';
import { assessmentRepo } from '../repositories/assessment.repository';
import type { AppVariables } from '../app';

/** Runs after `authenticate`: confirms the authenticated user owns the target assessment. */
export async function requireOwnership(c: Context<{ Variables: AppVariables }>, next: Next) {
  const id = c.req.param('id') ?? '';
  const userId = c.get('userId');
  const a = await assessmentRepo.findOwnerById(id);
  if (!a) throw AppError.notFound('assessment not found');
  if (!userId || a.userId !== userId) throw AppError.forbidden('not your assessment');
  c.set('assessment', a);
  await next();
}
