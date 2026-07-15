import { createFileRoute } from '@tanstack/react-router';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../../../server/src/config';
import { runtimePaths } from '../../../server/src/paths';
import { brandingExts } from '../../../server/src/media/storage';
import { fileResponse } from '../../../server/src/static/response';

async function faviconResponse(request: Request, ext: string) {
  const normalized = ext.toLowerCase();
  if (!brandingExts.has(normalized)) return new Response('Not Found', { status: 404 });
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const branding = join(config.uploadDir, 'branding', `favicon.${normalized}`);
  const fallback = join(runtimePaths.webAppDir, 'public', `favicon.${normalized}`);
  const response = await fileResponse(branding, acceptEncoding) || await fileResponse(fallback, acceptEncoding);
  if (response) {
    return request.method === 'HEAD'
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  }
  if (normalized !== 'ico') {
    const ico = existsSync(join(config.uploadDir, 'branding', 'favicon.ico'))
      ? join(config.uploadDir, 'branding', 'favicon.ico')
      : join(runtimePaths.webAppDir, 'public', 'favicon.ico');
    const fallbackResponse = await fileResponse(ico, acceptEncoding);
    if (fallbackResponse) return fallbackResponse;
  }
  return new Response('Not Found', { status: 404 });
}

export const Route = createFileRoute('/favicon.$ext')({ server: { handlers: {
  GET: ({ request, params }) => faviconResponse(request, params.ext),
  HEAD: ({ request, params }) => faviconResponse(request, params.ext),
} } });
