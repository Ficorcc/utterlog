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
  if (method !== 'GET' && method !== 'HEAD') return null;

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
