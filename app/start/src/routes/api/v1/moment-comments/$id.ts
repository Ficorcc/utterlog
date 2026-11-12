import { createFileRoute } from '@tanstack/react-router';
import { deleteMomentComment, MomentServiceError } from '@backend/services/moments';
import { apiFail, apiOk, withAdmin } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/moment-comments/$id')({ server: { handlers: {
  DELETE: ({ request, params }) => withAdmin(request, async () => {
    try {
      return apiOk(await deleteMomentComment(Number(params.id)));
    } catch (err) {
      if (err instanceof MomentServiceError) return apiFail(err.status, 'NOT_FOUND', err.message);
      throw err;
    }
  }),
} } });
