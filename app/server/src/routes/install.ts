import type { Hono } from 'hono';
import { fail, ok } from '../http/response';
import {
  createInstallAdmin,
  finishInstallation,
  installStatus,
  InstallServiceError,
  saveSetupConfig,
  setupStatus,
  testSetupDatabase,
} from '../services/install';
import { handleBlogRequest } from '../web/router';

function serviceError(c: any, error: unknown) {
  if (error instanceof InstallServiceError) return fail(c, error.status, error.code, error.message);
  throw error;
}

export function registerInstallRoutes(app: Hono, dbReady: boolean) {
  app.get('/install', async (c) => {
    const response = await handleBlogRequest(c.req.raw);
    return response || c.text('Install page unavailable', 503);
  });
  app.get('/api/v1/setup/status', async (c) => ok(c, await setupStatus(dbReady)));
  app.post('/api/v1/setup/test-db', async (c) => {
    try { return ok(c, await testSetupDatabase(await c.req.json().catch(() => ({})))); }
    catch (error) { return serviceError(c, error); }
  });
  app.post('/api/v1/setup/save', async (c) => {
    try { return ok(c, await saveSetupConfig()); }
    catch (error) { return serviceError(c, error); }
  });
  app.get('/api/v1/install/status', async (c) => ok(c, await installStatus(dbReady)));
  app.post('/api/v1/install/create-admin', async (c) => {
    try { return ok(c, await createInstallAdmin(await c.req.json().catch(() => ({})), dbReady)); }
    catch (error) { return serviceError(c, error); }
  });
  app.post('/api/v1/install/finish', async (c) => {
    try {
      return ok(c, await finishInstallation(await c.req.json().catch(() => ({})), c.req.header('X-Install-Token') || '', dbReady));
    } catch (error) { return serviceError(c, error); }
  });
}
