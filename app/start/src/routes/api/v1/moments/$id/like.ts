import { randomUUID } from 'node:crypto';
import { createFileRoute } from '@tanstack/react-router';
import { MomentServiceError, toggleMomentLike } from '@backend/services/moments';
import { apiFail, apiOk } from '../../../../../server/http';

const COOKIE_NAME = 'utterlog_moment_like';

function visitorToken(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const current = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) || '';
  if (/^[a-f0-9]{32}$/i.test(current)) return { value: current, created: false };
  return { value: randomUUID().replaceAll('-', ''), created: true };
}

export const Route = createFileRoute('/api/v1/moments/$id/like')({
  server: { handlers: {
    POST: async ({ request, params }) => {
      try {
        const visitor = visitorToken(request);
        const response = apiOk(await toggleMomentLike(Number(params.id), visitor.value));
        if (visitor.created) {
          const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
          response.headers.set('set-cookie', `${COOKIE_NAME}=${visitor.value}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
        }
        return response;
      } catch (err) {
        if (err instanceof MomentServiceError) return apiFail(err.status, err.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', err.message);
        throw err;
      }
    },
  } },
});
