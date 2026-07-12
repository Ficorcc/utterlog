import { createFileRoute } from '@tanstack/react-router';
import { listMoments } from '../../../../../../server/src/public-read';
import { apiPaginated } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/moments/')({
  server: { handlers: { GET: async ({ request }) => {
    const query = new URL(request.url).searchParams;
    const page = Math.max(1, Number(query.get('page') || 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(query.get('per_page') || 20) || 20));
    const result = await listMoments({ page, perPage });
    return apiPaginated(result.data.moments, result.meta);
  } } },
});
