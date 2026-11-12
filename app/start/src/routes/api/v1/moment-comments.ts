import { createFileRoute } from '@tanstack/react-router';
import { listMomentCommentsAdmin } from '@backend/services/moments';
import { apiOk, withAdmin } from '../../../server/http';

export const Route = createFileRoute('/api/v1/moment-comments')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => {
    const q = new URL(request.url).searchParams;
    return apiOk(await listMomentCommentsAdmin({
      page: Math.max(1, Number(q.get('page') || 1) || 1),
      perPage: Math.min(100, Math.max(1, Number(q.get('per_page') || 20) || 20)),
      search: q.get('search') || '',
    }));
  }),
} } });
