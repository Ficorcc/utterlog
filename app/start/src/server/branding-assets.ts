import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '@backend/config';
import { optionValue } from '@backend/db/options';
import { FAVICON_PNG_ASSETS } from '@backend/media/favicon';
import { brandingExts } from '@backend/media/storage';
import { runtimePaths } from '@backend/paths';
import { fileResponse } from '@backend/static/response';

// favicon-32x32 / apple-touch-icon / android-chrome-192x192 这类名字里带
// 连字符和数字，得一起放行，否则上传生成了文件也访问不到。
const brandingPath = /^\/(favicon|logo|dark-logo|favicon-\d+x\d+|apple-touch-icon|android-chrome-\d+x\d+)\.([a-z0-9]+)$/i;

/**
 * PWA manifest。跟 branding 静态文件走同一条拦截，而不是放进 src/routes/ ——
 * 文件路由会把 `site.webmanifest.ts` 里的点当成路径分隔符，解析成 /site/webmanifest。
 *
 * 内容动态生成：站点名和主题色后台可改，写死一份 JSON 必然跟设置对不上。
 * icons 只列磁盘上真实存在的，favicon 没上传过时不列，免得浏览器报 404。
 */
async function siteManifestResponse(request: Request): Promise<Response> {
  const dir = join(config.uploadDir, 'branding');
  const icons = FAVICON_PNG_ASSETS
    .filter((asset) => asset.size >= 192 && existsSync(join(dir, asset.name)))
    .map((asset) => ({
      src: `/${asset.name}`,
      sizes: `${asset.size}x${asset.size}`,
      type: 'image/png',
      purpose: 'any maskable',
    }));
  const [title, description, themeColor] = await Promise.all([
    optionValue('site_title', 'Utterlog'),
    optionValue('site_description', ''),
    optionValue('site_theme_color', '#0052d9'),
  ]);
  const name = (title || 'Utterlog').trim();
  const body = JSON.stringify({
    name,
    // 主屏图标下面的名字，系统一般在 12 字左右截断，这里先截好
    short_name: [...name].slice(0, 12).join(''),
    ...((description || '').trim() ? { description: description.trim() } : {}),
    icons,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: (themeColor || '#0052d9').trim() || '#0052d9',
  }, null, 2);
  const headers = {
    'content-type': 'application/manifest+json; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  };
  return request.method.toUpperCase() === 'HEAD'
    ? new Response(null, { headers })
    : new Response(body, { headers });
}

/** Serve top-level branding files before the file-router's dotted dynamic routes. */
export async function brandingAssetResponse(request: Request): Promise<Response | null> {
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) return null;
  const pathname = new URL(request.url).pathname;
  if (pathname === '/site.webmanifest' || pathname === '/manifest.json') {
    return siteManifestResponse(request);
  }
  const match = pathname.match(brandingPath);
  if (!match) return null;

  const asset = match[1].toLowerCase();
  const ext = match[2].toLowerCase();
  if (!brandingExts.has(ext)) return null;

  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const candidates = [
    join(config.uploadDir, 'branding', `${asset}.${ext}`),
    join(runtimePaths.webAppDir, 'public', `${asset}.${ext}`),
  ];
  if (asset === 'favicon' && ext !== 'ico') {
    candidates.unshift(join(config.uploadDir, 'branding', 'favicon.ico'));
    candidates.push(join(runtimePaths.webAppDir, 'public', 'favicon.ico'));
  }

  for (const path of candidates) {
    const response = await fileResponse(path, acceptEncoding);
    if (!response) continue;
    return request.method.toUpperCase() === 'HEAD'
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  }
  return null;
}
