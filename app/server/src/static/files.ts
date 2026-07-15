import type { Hono } from 'hono';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config';
import { brandingExts } from '../media/storage';
import { runtimePaths } from '../paths';
import { resolveThemeAssetPath } from '../theme-assets';
import { fileResponse, safeJoin } from './response';

export function serveStaticFiles(app: Hono) {
  app.get('/admin', (c) => c.redirect('/admin/', 301));
  app.get('/admin/*', async (c, next) => {
    const rest = c.req.path.replace(/^\/admin\/?/, '') || 'index.html';
    const candidate = safeJoin(config.adminDistDir, rest);
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const direct = await fileResponse(candidate, acceptEncoding);
    const isStaticAsset = rest !== 'index.html' && /\.[a-z0-9]+(?:\.(?:br|gz))?$/i.test(rest);
    if (!isStaticAsset || !direct) return next();
    const response = direct;
    const isHashedAsset = /\/assets\/[^/]+-[A-Za-z0-9_-]+\.(js|css)$/.test(c.req.path);
    const headers = new Headers(response.headers);
    if (isHashedAsset) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    }
    return new Response(response.body, { status: response.status, headers });
  });

  app.get('/uploads/*', async (c) => {
    const rest = c.req.path.replace(/^\/uploads\/?/, '');
    return (await fileResponse(safeJoin(config.uploadDir, rest), c.req.header('accept-encoding') || '')) || c.notFound();
  });

  const serveThemeAsset = async (c: any) => {
    const rest = c.req.path.replace(/^\/themes\/?/, '');
    const slash = rest.indexOf('/');
    const themeId = slash >= 0 ? rest.slice(0, slash) : rest;
    const filename = slash >= 0 ? rest.slice(slash + 1) : '';
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const resolved = filename ? resolveThemeAssetPath(themeId, filename) : null;
    if (resolved) {
      const res = await fileResponse(resolved, acceptEncoding);
      if (res) return res;
    }
    const runtime = safeJoin(join(config.contentDir, 'themes'), rest);
    const builtin = safeJoin(runtimePaths.builtinPublicThemesDir, rest);
    return (await fileResponse(runtime, acceptEncoding)) || (await fileResponse(builtin, acceptEncoding)) || c.notFound();
  };
  app.get('/themes/*', serveThemeAsset);
  app.on('HEAD', '/themes/*', serveThemeAsset);

  function brandingExt(pathname: string, asset: string): string | null {
    const prefix = `/${asset}.`;
    if (!pathname.startsWith(prefix)) return null;
    const ext = pathname.slice(prefix.length).toLowerCase();
    if (!ext || ext.includes('/')) return null;
    return brandingExts.has(ext) ? ext : null;
  }

  const serveBranding = (asset: string) => async (c: any) => {
    const ext = brandingExt(c.req.path, asset);
    if (!ext) return c.notFound();
    const branding = join(config.uploadDir, 'branding', `${asset}.${ext}`);
    const fallback = join(runtimePaths.serverPublicDir, `${asset}.${ext}`);
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const direct = (await fileResponse(branding, acceptEncoding)) || (await fileResponse(fallback, acceptEncoding));
    if (direct) return direct;
    if (asset === 'favicon' && ext !== 'ico') {
      const ico = join(config.uploadDir, 'branding', 'favicon.ico');
      const fallbackIco = join(runtimePaths.serverPublicDir, 'favicon.ico');
      return (await fileResponse(ico, acceptEncoding)) || (await fileResponse(fallbackIco, acceptEncoding)) || c.notFound();
    }
    return c.notFound();
  };

  app.get('/favicon.svg', async (c) => {
    if (existsSync(join(config.uploadDir, 'branding', 'favicon.svg'))) {
      return new Response(Bun.file(join(config.uploadDir, 'branding', 'favicon.svg')), {
        headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
      });
    }
    return new Response(Bun.file(runtimePaths.installerFavicon), {
      headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
    });
  });
  app.on('HEAD', '/favicon.svg', async (c) => {
    const uploaded = join(config.uploadDir, 'branding', 'favicon.svg');
    const file = existsSync(uploaded) ? Bun.file(uploaded) : Bun.file(runtimePaths.installerFavicon);
    if (!(await file.exists())) return c.notFound();
    return new Response(null, { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } });
  });

  for (const asset of ['logo', 'dark-logo', 'favicon'] as const) {
    const handler = serveBranding(asset);
    for (const ext of brandingExts) {
      const path = `/${asset}.${ext}`;
      app.get(path, handler);
      app.on('HEAD', path, handler);
    }
  }

  app.get('/assets/*', async (c) => {
    const rest = c.req.path.replace(/^\/assets\/?/, '');
    if (!rest) return c.notFound();
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const response = await fileResponse(safeJoin(runtimePaths.startClientAssetsDir, rest), acceptEncoding);
    if (!response) return c.notFound();
    const headers = new Headers(response.headers);
    if (/-[A-Za-z0-9_-]+\.(js|css)$/.test(rest)) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    return new Response(response.body, { status: response.status, headers });
  });
  app.on('HEAD', '/assets/*', async (c) => {
    const rest = c.req.path.replace(/^\/assets\/?/, '');
    if (!rest) return c.notFound();
    const response = await fileResponse(safeJoin(runtimePaths.startClientAssetsDir, rest), c.req.header('accept-encoding') || '');
    if (!response) return c.notFound();
    const headers = new Headers(response.headers);
    if (/-[A-Za-z0-9_-]+\.(js|css)$/.test(rest)) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    return new Response(null, { status: response.status, headers });
  });

  app.get('/static/*', async (c) => {
    const rest = c.req.path.replace(/^\/static\/?/, '');
    if (!rest) return c.notFound();
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const publicPath = safeJoin(join(runtimePaths.webAppDir, 'public', 'static'), rest);
    return (await fileResponse(publicPath, acceptEncoding)) || c.notFound();
  });
  app.on('HEAD', '/static/*', async (c) => {
    const rest = c.req.path.replace(/^\/static\/?/, '');
    if (!rest) return c.notFound();
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const publicPath = safeJoin(join(runtimePaths.webAppDir, 'public', 'static'), rest);
    return (await fileResponse(publicPath, acceptEncoding)) || c.notFound();
  });

  app.get('/styles/*', async (c) => {
    const rest = c.req.path.replace(/^\/styles\/?/, '');
    const path = safeJoin(join(runtimePaths.webAppDir, 'styles'), rest);
    const acceptEncoding = c.req.header('accept-encoding') || '';
    return (await fileResponse(path, acceptEncoding)) || c.notFound();
  });
  app.on('HEAD', '/styles/*', async (c) => {
    const rest = c.req.path.replace(/^\/styles\/?/, '');
    const path = safeJoin(join(runtimePaths.webAppDir, 'styles'), rest);
    const acceptEncoding = c.req.header('accept-encoding') || '';
    return (await fileResponse(path, acceptEncoding)) || c.notFound();
  });

  const serveWebPublic = (prefix: string) => async (c: any) => {
    const rest = c.req.path.replace(new RegExp(`^${prefix}/?`), '');
    const path = safeJoin(join(runtimePaths.webAppDir, 'public', prefix.slice(1)), rest);
    const acceptEncoding = c.req.header('accept-encoding') || '';
    return (await fileResponse(path, acceptEncoding)) || c.notFound();
  };
  for (const prefix of ['/emoji', '/icons', '/images']) {
    app.get(`${prefix}/*`, serveWebPublic(prefix));
    app.on('HEAD', `${prefix}/*`, serveWebPublic(prefix));
  }
}
