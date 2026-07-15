import { createFileRoute } from '@tanstack/react-router';
import { join } from 'node:path';
import { config } from '../../../../server/src/config';
import { runtimePaths } from '../../../../server/src/paths';
import { resolveThemeAssetPath } from '../../../../server/src/theme-assets';
import { fileResponse, safeJoin } from '../../../../server/src/static/response';

async function themeResponse(request: Request, splat: string) {
  const slash = splat.indexOf('/');
  const themeId = slash >= 0 ? splat.slice(0, slash) : splat;
  const filename = slash >= 0 ? splat.slice(slash + 1) : '';
  if (!themeId || !filename) return new Response('Not Found', { status: 404 });

  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const resolved = resolveThemeAssetPath(themeId, filename);
  const runtime = safeJoin(join(config.contentDir, 'themes'), splat);
  const builtin = safeJoin(runtimePaths.builtinPublicThemesDir, splat);
  const response = (resolved && await fileResponse(resolved, acceptEncoding))
    || await fileResponse(runtime, acceptEncoding)
    || await fileResponse(builtin, acceptEncoding);
  if (!response) return new Response('Not Found', { status: 404 });

  const headers = new Headers(response.headers);
  if (request.method === 'HEAD') return new Response(null, { status: response.status, headers });
  return new Response(response.body, { status: response.status, headers });
}

export const Route = createFileRoute('/themes/$')({
  server: {
    handlers: {
      GET: ({ request, params }) => themeResponse(request, String(params._splat || '')),
      HEAD: ({ request, params }) => themeResponse(request, String(params._splat || '')),
    },
  },
});
