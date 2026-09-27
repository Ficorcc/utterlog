import { createFileRoute } from '@tanstack/react-router';
import { join } from 'node:path';
import { config } from '@backend/config';
import { runtimePaths } from '@backend/paths';
import { resolveThemeAssetPath } from '@backend/theme-assets';
import { fileResponse, safeJoin } from '@backend/static/response';

// 主题资源走这个路由动态返回（为了同时覆盖运行时上传的 content/themes），
// 所以拿不到 Caddy `file_server` 那套缓存头 —— 浏览器每次访问都要重新下载
// styles.css 与场景图（首页 Hero 的 LCP 图就在其中）。这里按资源类型补齐：
//   · 带 ?v= 的（document.ts 会拼主题版本号）是内容寻址 URL，可常年 immutable
//   · 图片文件名固定，用 1 天 + 7 天 stale-while-revalidate，换图一天内生效
//   · 其余（json / woff2 等）7 天 + 30 天 SWR
const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif', '.svg', '.ico']);

function themeCacheControl(request: Request, filename: string) {
  try {
    if (new URL(request.url).searchParams.has('v')) {
      return 'public, max-age=31536000, immutable';
    }
  } catch {
    // 畸形 URL 退回保守分支
  }
  const ext = (filename.toLowerCase().match(/\.[a-z0-9]+$/) || [''])[0];
  return IMAGE_EXTENSIONS.has(ext)
    ? 'public, max-age=86400, stale-while-revalidate=604800'
    : 'public, max-age=604800, stale-while-revalidate=2592000';
}

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
  headers.set('cache-control', themeCacheControl(request, filename));
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
