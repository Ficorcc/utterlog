import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runtimePaths } from '../paths';

type StartServer = {
  default?: {
    fetch: (request: Request) => Response | Promise<Response>;
  };
};

let startServerPromise: Promise<StartServer> | null = null;

function startFrontendEnabled() {
  const value = String(process.env.UTTERLOG_FRONTEND || process.env.WEB_RENDERER || '').trim().toLowerCase();
  return value === 'start' || value === 'tanstack-start';
}

async function startServer() {
  if (!existsSync(runtimePaths.startServerEntry)) return null;
  startServerPromise ||= import(pathToFileURL(runtimePaths.startServerEntry).href) as Promise<StartServer>;
  const mod = await startServerPromise;
  return mod.default?.fetch ? mod.default : null;
}

export async function handleStartRequest(request: Request): Promise<Response | null> {
  if (!startFrontendEnabled()) return null;
  const method = request.method.toUpperCase();

  const server = await startServer();
  if (!server) return null;

  try {
    const response = await server.fetch(request);
    if (method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers });
    }
    return response;
  } catch (err) {
    console.error('TanStack Start render error:', err);
    return null;
  }
}

export function isStartNativeApiRequest(request: Request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const anonymousGet = method === 'GET' && !request.headers.get('authorization');
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
  if (url.pathname === '/api/v1/visitor/weather') return method === 'GET';
  if (method === 'GET' && url.pathname === '/api/v1/comments') return true;
  if (anonymousGet && ['/api/v1/options', '/api/v1/categories', '/api/v1/tags', '/api/v1/posts', '/api/v1/moments'].includes(url.pathname)) return true;
  if (url.pathname === '/api/v1/comments' && method === 'POST') return true;
  if (anonymousGet && /^\/api\/v1\/(books|games|goods|links|movies|music|playlists)$/.test(url.pathname)) return true;
  if (anonymousGet && ['/api/v1/owner', '/api/v1/archive/stats', '/api/v1/footprints', '/api/v1/moments/recent-tags', '/api/v1/public/albums'].includes(url.pathname)) return true;
  if (anonymousGet && /^\/api\/v1\/public\/albums\/[^/]+$/.test(url.pathname)) return true;
  if (anonymousGet && /^\/api\/v1\/posts\/(slug\/[^/]+|by-display-id\/\d+|\d+)$/.test(url.pathname)) return true;
  if (anonymousGet && /^\/api\/v1\/posts\/\d+\/(comments|episodes|navigation)$/.test(url.pathname)) return true;
  if (url.pathname === '/api/v1/links/apply') return method === 'POST';
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
