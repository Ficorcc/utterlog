import { createFileRoute } from '@tanstack/react-router';
import { join } from 'node:path';
import { config } from '../../../server/src/config';
import { runtimePaths } from '../../../server/src/paths';
import { brandingExts } from '../../../server/src/media/storage';
import { fileResponse } from '../../../server/src/static/response';

async function brandingResponse(request: Request, ext: string) {
  const normalized = ext.toLowerCase();
  if (!brandingExts.has(normalized)) return new Response('Not Found', { status: 404 });
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const response = await fileResponse(join(config.uploadDir, 'branding', `dark-logo.${normalized}`), acceptEncoding)
    || await fileResponse(join(runtimePaths.serverPublicDir, `dark-logo.${normalized}`), acceptEncoding);
  if (!response) return new Response('Not Found', { status: 404 });
  const headers = new Headers(response.headers);
  return request.method === 'HEAD'
    ? new Response(null, { status: response.status, headers })
    : new Response(response.body, { status: response.status, headers });
}

export const Route = createFileRoute('/dark-logo.$ext')({ server: { handlers: {
  GET: ({ request, params }) => brandingResponse(request, params.ext),
  HEAD: ({ request, params }) => brandingResponse(request, params.ext),
} } });
