import type { Context, Next } from 'hono';
import { AppError } from '../lib/errors';
import { sessionRepo } from '../repositories/session.repository';
import type { AppVariables } from '../app';

function bearerToken(c: Context): string | null {
  const header = c.req.header('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}

/**
 * Authenticates a request by resolving its `Authorization: Bearer <token>`
 * capability token to a user. The token is an opaque, unguessable session
 * secret — distinct from any resource id — and is rejected once expired.
 */
export async function authenticate(c: Context<{ Variables: AppVariables }>, next: Next) {
  const token = bearerToken(c);
  if (!token) throw AppError.unauthorized('missing bearer token');
  const session = await sessionRepo.findValid(token);
  if (!session) throw AppError.unauthorized('invalid or expired token');
  c.set('userId', session.userId);
  await next();
}
