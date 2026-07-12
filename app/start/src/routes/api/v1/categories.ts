import { createFileRoute } from '@tanstack/react-router';
import { listMetas } from '../../../../../server/src/public-read';
import { apiOk, apiPaginated } from '../../../server/http';

export const Route = createFileRoute('/api/v1/categories')({
  server: { handlers: { GET: async ({ request }) => {
    const query = new URL(request.url).searchParams;
    const rows = await listMetas('category', true);
    if (!query.has('page') && !query.has('per_page')) return apiOk(rows);
    const page = Math.max(1, Number(query.get('page') || 1) || 1);
    const perPage = Math.min(500, Math.max(1, Number(query.get('per_page') || 20) || 20));
    return apiPaginated(rows.slice((page - 1) * perPage, page * perPage), {
      total: rows.length, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(rows.length / perPage)),
    });
  } } },
});
