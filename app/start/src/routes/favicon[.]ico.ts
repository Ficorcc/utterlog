import { createFileRoute } from '@tanstack/react-router';
import { join } from 'node:path';
import { config } from '../../../server/src/config';
import { runtimePaths } from '../../../server/src/paths';
import { fileResponse } from '../../../server/src/static/response';

async function faviconResponse(request: Request) {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const response = await fileResponse(join(config.uploadDir, 'branding', 'favicon.ico'), acceptEncoding)
    || await fileResponse(join(runtimePaths.webAppDir, 'public', 'favicon.ico'), acceptEncoding);
  if (!response) return new Response('Not Found', { status: 404 });
  return request.method === 'HEAD'
    ? new Response(null, { status: response.status, headers: response.headers })
    : response;
}

export const Route = createFileRoute('/favicon.ico')({ server: { handlers: {
  GET: ({ request }) => faviconResponse(request),
  HEAD: ({ request }) => faviconResponse(request),
} } });
