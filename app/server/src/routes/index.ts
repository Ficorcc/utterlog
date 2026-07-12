import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from '../config';
import { bodySizeLimit, rateLimit, securityDefense, securityHeaders } from '../http/security';
import { installRedirect } from '../http/install-redirect';
import { serveStaticFiles } from '../static/files';
import { handleStartApiRequest, handleStartRequest } from '../web/start';

export function matchCorsOrigin(origin: string | undefined, corsOrigin: string, appUrl: string) {
  if (!origin) return undefined;
  if (corsOrigin === '*') return '*';
  const configured = corsOrigin.split(',').map((value) => value.trim()).filter(Boolean);
  let appOrigin = '';
  try {
    appOrigin = new URL(appUrl).origin;
  } catch {
    appOrigin = '';
  }
  const allowed = configured.length > 0 ? configured : [appOrigin].filter(Boolean);
  return allowed.includes(origin) ? origin : undefined;
}

export function configuredCorsOrigin(origin: string | undefined) {
  return matchCorsOrigin(origin, config.corsOrigin, config.appUrl);
}

function noCacheApiResponse(response: Response) {
  const headers = new Headers(response.headers);
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'private, no-store, no-cache, must-revalidate');
    headers.set('pragma', 'no-cache');
    headers.set('expires', '0');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function startApiResponse(c: Context) {
  const response = await handleStartApiRequest(c.req.raw);
  if (response) return noCacheApiResponse(response);
  return c.json({
    success: false,
    error: { code: 'START_UNAVAILABLE', message: 'TanStack Start 服务不可用' },
    meta: { request_id: crypto.randomUUID(), timestamp: new Date().toISOString() },
  }, 503);
}

export function createApp(dbReady: boolean) {
  const app = new Hono();

  app.onError((error, c) => {
    console.error('Unhandled request error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      meta: { request_id: crypto.randomUUID(), timestamp: new Date().toISOString() },
    }, 500);
  });

  app.use('*', logger());
  app.use('*', securityHeaders);
  app.use('*', bodySizeLimit);
  app.use('*', securityDefense);
  app.use('*', rateLimit);
  app.use('*', cors({
    origin: configuredCorsOrigin,
    allowHeaders: ['Content-Type', 'Authorization', 'X-WebAuthn-Session', 'X-Utterlog-Passport'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  }));

  serveStaticFiles(app);
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt']) {
    app.all(path, async (c) => {
      const response = await handleStartRequest(c.req.raw);
      return response || c.text('TanStack Start service unavailable', 503);
    });
  }
  app.all('/api', startApiResponse);
  app.all('/api/*', startApiResponse);

  app.notFound(async (c) => {
    if (c.req.path.startsWith('/api/')) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'api route not found' } }, 404);
    }
    const redirect = await installRedirect(c.req.raw, dbReady);
    if (redirect) return redirect;
    const response = await handleStartRequest(c.req.raw);
    return response || c.text('TanStack Start service unavailable', 503);
  });

  return app;
}
