import { createFileRoute } from '@tanstack/react-router';
import { listComments } from '../../../../../../server/src/public-read';
import { apiPaginated } from '../../../../server/http';

function positive(value: string | null, fallback: number) {
  const number = Number(value || fallback);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

export const Route = createFileRoute('/api/v1/comments/')({
  server: { handlers: { GET: async ({ request }) => {
    const query = new URL(request.url).searchParams;
    const result = await listComments({
      page: positive(query.get('page'), 1), perPage: positive(query.get('per_page'), 20), status: 'approved',
      postId: positive(query.get('post_id'), 0), topLevel: query.get('top_level') === 'true',
      excludeAdmin: ['1', 'true'].includes(query.get('exclude_admin') || ''), order: query.get('order') || 'desc',
    });
    return apiPaginated(result.data, result.meta);
  } } },
});
