import { createFileRoute } from '@tanstack/react-router';
import { authenticateRequest } from '../../../../../server/src/auth/session';
import { asContentResource, ContentRecordError, createContentRecord, listContentRecords } from '../../../../../server/src/services/content-records';
import { apiFail, apiOk, apiPaginated, withAdmin } from '../../../server/http';

export const Route = createFileRoute('/api/v1/$resource')({
  server: { handlers: {
    GET: async ({ request, params }) => {
      try {
        const resource = asContentResource(params.resource);
        const query = new URL(request.url).searchParams;
        const session = await authenticateRequest(request).catch(() => null);
        const result = await listContentRecords(resource, {
          page: Number(query.get('page') || 1),
          perPage: Number(query.get('per_page') || query.get('limit') || 20),
          status: query.get('status') || '',
          authed: Boolean(session),
        });
        return apiPaginated(result.rows, result.meta);
      } catch (error) {
        if (error instanceof ContentRecordError) return apiFail(error.status, error.code, error.message);
        throw error;
      }
    },
    POST: ({ request, params }) => withAdmin(request, async (session) => {
      try {
        const resource = asContentResource(params.resource);
        const body = await request.json().catch(() => ({})) as Record<string, unknown>;
        return apiOk(await createContentRecord(resource, body, session.userId));
      } catch (error) {
        if (error instanceof ContentRecordError) return apiFail(error.status, error.code, error.message);
        throw error;
      }
    }),
  } },
});
