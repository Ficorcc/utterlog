import type { Context, Next } from 'hono';
import { forbidden, unauthorized } from '../http/response';
import { authenticateRequest } from './session';

type AuthVariables = {
  userId?: number;
  userRole?: string;
};

async function authenticateAccess(c: Context) {
  const session = await authenticateRequest(c.req.raw);
  if (!session) return null;
  c.set('userId', session.userId);
  c.set('userRole', session.role);
  return session;
}

export async function auth(c: Context, next: Next) {
  try {
    const session = await authenticateAccess(c);
    if (!session) return unauthorized(c);
    await next();
  } catch {
    return unauthorized(c, 'Token 无效或已过期');
  }
}

export async function adminAuth(c: Context, next: Next) {
  try {
    const session = await authenticateAccess(c);
    if (!session) return unauthorized(c);
    if (session.role !== 'admin') return forbidden(c, '需要管理员权限');
    await next();
  } catch {
    return unauthorized(c, 'Token 无效或已过期');
  }
}

export async function optionalAuth(c: Context, next: Next) {
  try {
    await authenticateAccess(c);
  } catch {
    // Optional auth keeps public reads available when a visitor token is stale.
  }
  await next();
}

export function currentUserId(c: Context) {
  const userId = c.get('userId');
  return typeof userId === 'number' ? userId : 0;
}

export function currentUserRole(c: Context) {
  const role = c.get('userRole');
  return typeof role === 'string' ? role : '';
}
