import { createFileRoute } from '@tanstack/react-router';
import { listAiCommentsPayload } from '../../../../../../../server/src/routes/ai';
import { apiOk, withAdmin } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/admin/ai-comments/')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => (
    apiOk(await listAiCommentsPayload(new URL(request.url).searchParams))
  )),
} } });
