import { createMiddleware, createStart } from '@tanstack/react-start';
import { config } from '../../server/src/config';

const allowedHeaders = 'Content-Type, Authorization, X-WebAuthn-Session, X-Utterlog-Passport';
const allowedMethods = 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD';

function allowedOrigin(origin: string | null) {
  if (!origin) return '';
  if (config.corsOrigin === '*') return '*';
  const configured = config.corsOrigin.split(',').map((value) => value.trim()).filter(Boolean);
  let appOrigin = '';
  try {
    appOrigin = new URL(config.appUrl).origin;
  } catch {
    // Invalid production configuration is rejected during server startup.
  }
  const allowed = configured.length > 0 ? configured : [appOrigin].filter(Boolean);
  return allowed.includes(origin) ? origin : '';
}

const cors = createMiddleware().server(async ({ next, request }) => {
  const origin = allowedOrigin(request.headers.get('origin'));
  if (request.method.toUpperCase() === 'OPTIONS') {
    const headers = new Headers({
      'access-control-allow-methods': allowedMethods,
      'access-control-allow-headers': allowedHeaders,
      'access-control-max-age': '600',
    });
    if (origin) {
      headers.set('access-control-allow-origin', origin);
      headers.set('access-control-allow-credentials', 'true');
      headers.set('vary', 'Origin');
    }
    return new Response(null, { status: 204, headers });
  }

  const result = await next();
  const headers = new Headers(result.response.headers);
  if (origin) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-credentials', 'true');
    headers.append('vary', 'Origin');
  }
  return new Response(result.response.body, {
    status: result.response.status,
    statusText: result.response.statusText,
    headers,
  });
});

// Keep baseline response hardening inside Start so direct Start requests do
// not depend on the legacy Hono gateway for security headers.
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const headers = new Headers(result.response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(self)');
  return new Response(result.response.body, {
    status: result.response.status,
    statusText: result.response.statusText,
    headers,
  });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [cors, securityHeaders],
}));
