import { randomUUID } from 'node:crypto';
import { AuthRequestError, requireAdminRequest } from '../../../server/src/auth/session';

function meta() {
  return { request_id: randomUUID(), timestamp: new Date().toISOString() };
}

export function apiOk(data: unknown = null, status = 200) {
  return Response.json({ success: true, data, meta: meta() }, { status });
}

export function apiFail(status: number, code: string, message: string) {
  return Response.json({ success: false, error: { code, message }, meta: meta() }, { status });
}

export async function withAdmin(request: Request, handler: () => Promise<Response>) {
  try {
    await requireAdminRequest(request);
    return await handler();
  } catch (err) {
    if (err instanceof AuthRequestError) {
      return apiFail(err.status, err.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', err.message);
    }
    console.error('TanStack Start API error:', err);
    return apiFail(500, 'INTERNAL_ERROR', '服务器内部错误');
  }
}
