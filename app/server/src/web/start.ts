import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runtimePaths } from '../paths';

type StartServer = {
  default?: {
    fetch: (request: Request) => Response | Promise<Response>;
  };
};

let startServerPromise: Promise<StartServer> | null = null;

export function startFrontendEnabled() {
  const value = String(process.env.UTTERLOG_FRONTEND || process.env.WEB_RENDERER || '').trim().toLowerCase();
  return value === 'start' || value === 'tanstack-start';
}

async function startServer() {
  if (!existsSync(runtimePaths.startServerEntry)) return null;
  startServerPromise ||= import(pathToFileURL(runtimePaths.startServerEntry).href) as Promise<StartServer>;
  const mod = await startServerPromise;
  return mod.default?.fetch ? mod.default : null;
}

export async function preloadStartServer() {
  if (!startFrontendEnabled()) return false;
  return Boolean(await startServer());
}

export async function warmStartFrontend(origin: string) {
  if (!startFrontendEnabled()) return false;
  const response = await fetch(new URL('/', origin), {
    headers: { 'x-utterlog-warmup': '1' },
    signal: AbortSignal.timeout(15_000),
  });
  await response.arrayBuffer();
  return response.ok;
}

export async function handleStartRequest(request: Request): Promise<Response | null> {
  if (!startFrontendEnabled()) return null;
  const method = request.method.toUpperCase();

  const server = await startServer();
  if (!server) return null;

  try {
    const response = await server.fetch(request);
    const headers = new Headers(response.headers);
    if (!headers.has('x-utterlog-renderer')) headers.set('x-utterlog-renderer', 'tanstack-start');
    if (method === 'HEAD') {
      return new Response(null, { status: response.status, statusText: response.statusText, headers });
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    console.error('TanStack Start render error:', err);
    return null;
  }
}

export function isStartNativeApiRequest(request: Request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const anonymousGet = method === 'GET' && !request.headers.get('authorization');
  if (url.pathname === '/api/v1/health') return method === 'GET';
  if (url.pathname === '/api/v1/track' || url.pathname === '/api/v1/track/duration') return method === 'POST';
  if (url.pathname === '/api/v1/online') return method === 'GET';
  if (url.pathname === '/api/v1/feed' || url.pathname === '/api/v1/social/feed-timeline' || url.pathname === '/api/v1/social/feed-stats') return method === 'GET';
  if (url.pathname === '/api/v1/social/fetch-feeds') return method === 'POST';
  if (url.pathname === '/api/v1/social/fetch-feeds/status') return method === 'GET';
  if (/^\/api\/v1\/social\/(follow-status|following|management)$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/social\/(follow|unfollow)$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/import\/(wordpress|typecho)$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/sync\/(wordpress|typecho)\/(ping|start|batch|finish|rollback)$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/sync\/(wordpress|typecho)\/job\/[^/]+\/status$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/admin\/sync\/(wordpress|typecho)\/sites$/.test(url.pathname)) return method === 'GET' || method === 'POST';
  if (/^\/api\/v1\/admin\/sync\/(wordpress|typecho)\/sites\/[^/]+$/.test(url.pathname)) return method === 'DELETE';
  if (/^\/api\/v1\/admin\/sync\/(wordpress|typecho)\/jobs$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/telegram\/(webhook|test|get-chat-id|setup-webhook)$/.test(url.pathname)) return method === 'POST';
  if (url.pathname === '/api/v1/federation/metadata') return method === 'GET';
  if (/^\/api\/v1\/federation\/(follow|verify|webhook|token)$/.test(url.pathname)) return method === 'POST';
  if (url.pathname === '/api/v1/comments/federated' || url.pathname === '/api/v1/passport/identify') return method === 'POST';
  if (/^\/api\/v1\/network\/(status|feed|sites|subscriptions|pull-content|utterlog-profile|content)$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/network\/(push-info|subscribe|unsubscribe|publish-notify|bind-utterlog-id|unbind-utterlog-id)$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/network\/oauth\/(authorize|callback)$/.test(url.pathname)) return method === 'GET';
  if (url.pathname === '/api/v1/setup/status' || url.pathname === '/api/v1/install/status') return method === 'GET';
  if (url.pathname === '/api/v1/setup/test-db' || url.pathname === '/api/v1/setup/save') return method === 'POST';
  if (url.pathname === '/api/v1/install/create-admin' || url.pathname === '/api/v1/install/finish') return method === 'POST';
  if (url.pathname === '/api/v1/auth/login' || url.pathname === '/api/v1/auth/refresh' || url.pathname === '/api/v1/auth/logout') {
    return method === 'POST';
  }
  if (url.pathname === '/api/v1/auth/me') return method === 'GET';
  if (url.pathname === '/api/v1/profile') return method === 'GET' || method === 'PUT';
  if (url.pathname === '/api/v1/profile/send-code') return method === 'POST';
  if (url.pathname === '/api/v1/auth/password') return method === 'PUT';
  if (url.pathname === '/api/v1/auth/forgot-password' || url.pathname === '/api/v1/auth/reset-password') return method === 'POST';
  if (/^\/api\/v1\/auth\/totp\/(setup|verify|disable|validate)$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/auth\/passkey\/(register|login)\/(begin|finish)$/.test(url.pathname)) return method === 'POST';
  if (url.pathname === '/api/v1/auth/passkey/available') return method === 'GET';
  if (url.pathname === '/api/v1/passkeys') return method === 'GET';
  if (/^\/api\/v1\/passkeys\/[^/]+$/.test(url.pathname)) return method === 'DELETE';
  if (url.pathname === '/api/v1/notifications') return method === 'GET';
  if (url.pathname === '/api/v1/notifications/unread-count' || url.pathname === '/api/v1/notifications/stream') return method === 'GET';
  if (url.pathname === '/api/v1/notifications/read-all') return method === 'POST';
  if (/^\/api\/v1\/notifications\/\d+\/read$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/notifications\/\d+$/.test(url.pathname)) return method === 'DELETE';
  if (url.pathname === '/api/v1/annotations') return method === 'GET' || method === 'POST';
  if (url.pathname === '/api/v1/admin/annotations') return method === 'GET';
  if (url.pathname === '/api/v1/admin/annotations/batch-delete') return method === 'POST';
  if (/^\/api\/v1\/admin\/annotations\/\d+$/.test(url.pathname)) return method === 'DELETE';
  if (/^\/api\/v1\/security\/(overview|settings|bans|timeline)$/.test(url.pathname)) return method === 'GET' || (url.pathname.endsWith('/settings') && method === 'POST');
  if (/^\/api\/v1\/security\/(ban|unban)$/.test(url.pathname)) return method === 'POST';
  if (url.pathname === '/api/v1/system/status' || url.pathname === '/api/v1/admin/stats') return method === 'GET';
  if (/^\/api\/v1\/admin\/system\/(version|releases)$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/admin\/system\/(upgrade|rebuild-stats|clear-cache|clear-rss-cache|cleanup-database)$/.test(url.pathname)) return method === 'POST';
  if (url.pathname === '/api/v1/admin/system/upgrade/status' || url.pathname === '/api/v1/system/update-check') return method === 'GET';
  if (url.pathname === '/api/v1/admin/analytics/stats') return method === 'GET';
  if (url.pathname === '/api/v1/admin/analytics/purge') return method === 'POST';
  if (url.pathname === '/api/v1/analytics' || /^\/api\/v1\/analytics\/(online|visitors|logs|geoip|map|breakdown)$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/backup\/(stats|list)$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/backup\/(create|import)$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/backup\/download\/[^/]+\.zip$/.test(url.pathname)) return method === 'GET';
  if (/^\/api\/v1\/backup\/[^/]+\.zip$/.test(url.pathname)) return method === 'DELETE';
  if (url.pathname === '/api/v1/themes' || url.pathname === '/api/v1/plugins') return method === 'GET';
  if (url.pathname === '/api/v1/themes/upload' || url.pathname === '/api/v1/plugins/upload') return method === 'POST';
  if (/^\/api\/v1\/themes\/[^/]+\/activate$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/plugins\/[^/]+\/(activate|deactivate)$/.test(url.pathname)) return method === 'POST';
  if (/^\/api\/v1\/(themes|plugins)\/[^/]+$/.test(url.pathname)) return method === 'DELETE';
  if (url.pathname === '/api/v1/visitor/weather') return method === 'GET';
  if (url.pathname === '/api/v1/visitor/geo' || url.pathname === '/api/v1/search') return method === 'GET';
  if (url.pathname === '/api/v1/location/reverse') return method === 'GET';
  if (url.pathname === '/api/v1/admin/footprints' || url.pathname === '/api/v1/admin/footprints/places') return method === 'GET';
  if (url.pathname === '/api/v1/admin/footprints/geocode') return method === 'POST';
  if (/^\/api\/v1\/admin\/footprints\/\d+$/.test(url.pathname)) return method === 'PUT';
  if (url.pathname === '/api/v1/i18n/locales' || url.pathname === '/api/v1/i18n/current') return method === 'GET';
  if (/^\/api\/v1\/i18n\/[^/]+$/.test(url.pathname)) return method === 'GET';
  if (url.pathname === '/api/v1/options/test-email') return method === 'POST';
  if (url.pathname === '/api/v1/coding') return method === 'GET';
  if (url.pathname === '/api/v1/media/upload-branding') return method === 'POST';
  if (url.pathname === '/api/v1/media' || url.pathname === '/api/v1/media/stats') return method === 'GET';
  if (['/api/v1/media/upload', '/api/v1/media/download-url', '/api/v1/media/test-connection'].includes(url.pathname)) return method === 'POST';
  if (url.pathname === '/api/v1/media/exif') return method === 'GET';
  if (url.pathname === '/api/v1/media/parse' || url.pathname === '/api/v1/media/douban-import') return method === 'POST';
  if (/^\/api\/v1\/media\/\d+$/.test(url.pathname)) return method === 'DELETE';
  if (url.pathname === '/api/v1/rss/parse' || url.pathname === '/api/v1/music/search') return method === 'GET';
  if (/^\/api\/v1\/music\/proxy\/[^/]+\/songs\/[^/]+\/(cover|stream|lyric)$/.test(url.pathname)) return method === 'GET';
  if (url.pathname === '/api/v1/captcha/challenge' || url.pathname === '/api/v1/captcha/image') return method === 'GET';
  if (method === 'GET' && url.pathname === '/api/v1/comments') return true;
  if (url.pathname === '/api/v1/options') return method === 'GET' || method === 'PUT' || method === 'POST';
  if (url.pathname === '/api/v1/categories' || url.pathname === '/api/v1/tags') return method === 'GET' || method === 'POST';
  if (/^\/api\/v1\/(categories|tags)\/\d+$/.test(url.pathname)) return method === 'GET' || method === 'PUT' || method === 'DELETE';
  if (url.pathname === '/api/v1/posts') return method === 'GET' || method === 'POST';
  if (url.pathname === '/api/v1/moments') return method === 'GET' || method === 'POST';
  if (/^\/api\/v1\/moments\/\d+$/.test(url.pathname)) return method === 'GET' || method === 'PUT' || method === 'DELETE';
  if (url.pathname === '/api/v1/comments' && method === 'POST') return true;
  if (url.pathname === '/api/v1/links/apply') return method === 'POST';
  if (url.pathname === '/api/v1/playlists/import') return method === 'POST';
  if (/^\/api\/v1\/playlists\/\d+\/songs$/.test(url.pathname)) return method === 'POST' || method === 'DELETE';
  if (/^\/api\/v1\/albums\/\d+\/photos$/.test(url.pathname)) return method === 'GET' || method === 'POST';
  if (/^\/api\/v1\/albums\/\d+\/photos\/\d+$/.test(url.pathname)) return method === 'DELETE';
  if (/^\/api\/v1\/(albums|books|games|goods|links|movies|music|playlists|videos)$/.test(url.pathname)) {
    return method === 'GET' || method === 'POST';
  }
  if (/^\/api\/v1\/(albums|books|games|goods|links|movies|music|playlists|videos)\/[^/]+$/.test(url.pathname)) {
    return method === 'GET' || method === 'PUT' || method === 'DELETE';
  }
  if (anonymousGet && ['/api/v1/owner', '/api/v1/archive/stats', '/api/v1/footprints', '/api/v1/moments/recent-tags', '/api/v1/public/albums'].includes(url.pathname)) return true;
  if (anonymousGet && /^\/api\/v1\/public\/albums\/[^/]+$/.test(url.pathname)) return true;
  if (/^\/api\/v1\/posts\/-?\d+$/.test(url.pathname)) return method === 'GET' || method === 'PUT' || method === 'DELETE';
  if (method === 'GET' && /^\/api\/v1\/posts\/(slug\/[^/]+|by-display-id\/\d+)$/.test(url.pathname)) return true;
  if (method === 'GET' && /^\/api\/v1\/posts\/-?\d+\/(comments|episodes|navigation)$/.test(url.pathname)) return true;
  if (/^\/api\/v1\/comments\/\d+\/edit$/.test(url.pathname)) return method === 'PUT';
  if (/^\/api\/v1\/comments\/\d+\/approve$/.test(url.pathname)) return method === 'PATCH';
  if (/^\/api\/v1\/comments\/\d+\/reply$/.test(url.pathname)) return method === 'POST';
  if (url.pathname === '/api/v1/comments/pending-count') return method === 'GET';
  if (url.pathname === '/api/v1/comments/batch') return method === 'POST';
  if (/^\/api\/v1\/comments\/\d+$/.test(url.pathname)) {
    return method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  }
  return false;
}

export async function handleStartApiRequest(request: Request) {
  return isStartNativeApiRequest(request) ? handleStartRequest(request) : null;
}
