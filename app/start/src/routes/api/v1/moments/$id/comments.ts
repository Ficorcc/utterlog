import { createFileRoute } from '@tanstack/react-router';
import { createMomentComment, listMomentComments, MomentServiceError } from '@backend/services/moments';
import { apiFail, apiOk } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/moments/$id/comments')({ server: { handlers: {
  GET: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return apiFail(400, 'VALIDATION_ERROR', '无效的说说 ID');
    return apiOk(await listMomentComments(id));
  },
  POST: async ({ params, request }) => {
    const id = Number(params.id);
    try {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      return apiOk(await createMomentComment(id, body));
    } catch (err) {
      if (err instanceof MomentServiceError) return apiFail(err.status, 'VALIDATION_ERROR', err.message);
      throw err;
    }
  },
} } });
