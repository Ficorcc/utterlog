import { createMiddleware, createStart } from '@tanstack/react-start';

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
  requestMiddleware: [securityHeaders],
}));
