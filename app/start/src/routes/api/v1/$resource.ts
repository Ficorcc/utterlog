import { createFileRoute } from '@tanstack/react-router';
import { listPublicContent } from '../../../../../server/src/public-read';
import { apiFail, apiPaginated } from '../../../server/http';

const resources = new Set(['books', 'games', 'goods', 'links', 'movies', 'music', 'playlists']);

export const Route = createFileRoute('/api/v1/$resource')({
  server: { handlers: { GET: async ({ request, params }) => {
    if (!resources.has(params.resource)) return apiFail(404, 'NOT_FOUND', 'api route not found');
    const query = new URL(request.url).searchParams;
    const page = Math.max(1, Number(query.get('page') || 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(query.get('per_page') || 20) || 20));
    const result = await listPublicContent(params.resource as 'books' | 'games' | 'goods' | 'links' | 'movies' | 'music' | 'playlists', { page, perPage });
    return apiPaginated(result.data, result.meta);
  } } },
});
