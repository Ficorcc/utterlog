import type { Context, Hono } from 'hono';
import { auth } from '../auth/middleware';
import { badRequest, ok, unauthorized } from '../http/response';
import {
  authenticatedUser,
  AuthServiceError,
  changePassword,
  forgotPassword,
  getProfile,
  loginWithPassword,
  refreshAuthTokens,
  resetPassword,
  updateProfile,
} from '../services/auth';

async function authResponse(c: Context, handler: () => Promise<unknown>) {
  try {
    return ok(c, await handler());
  } catch (err) {
    if (err instanceof AuthServiceError) {
      return err.status === 401 ? unauthorized(c, err.message) : badRequest(c, err.message, err.code);
    }
    throw err;
  }
}

async function jsonBody(c: Context) {
  return c.req.json().catch(() => ({}));
}

export function registerAuthRoutes(app: Hono) {
  app.post('/api/v1/auth/login', (c) => authResponse(c, async () => loginWithPassword(await jsonBody(c))));
  app.post('/api/v1/auth/refresh', (c) => authResponse(c, async () => refreshAuthTokens(await jsonBody(c))));
  app.post('/api/v1/auth/logout', auth, (c) => authResponse(c, async () => {
    await authenticatedUser(c.req.raw);
    return null;
  }));
  app.get('/api/v1/auth/me', auth, (c) => authResponse(c, () => authenticatedUser(c.req.raw)));
  app.get('/api/v1/profile', auth, (c) => authResponse(c, () => getProfile(c.req.raw)));
  app.put('/api/v1/profile', auth, (c) => authResponse(c, async () => updateProfile(c.req.raw, await jsonBody(c))));
  app.put('/api/v1/auth/password', auth, (c) => authResponse(c, async () => changePassword(c.req.raw, await jsonBody(c))));
  app.post('/api/v1/auth/forgot-password', (c) => authResponse(c, async () => forgotPassword(await jsonBody(c))));
  app.post('/api/v1/auth/reset-password', (c) => authResponse(c, async () => resetPassword(await jsonBody(c))));
}
