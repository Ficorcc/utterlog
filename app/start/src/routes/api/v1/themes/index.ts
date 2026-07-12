import { createFileRoute } from '@tanstack/react-router';
import { listThemesPayload } from '../../../../../../server/src/routes/extensions';
import { apiOk, withAdmin } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/themes/')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => apiOk(await listThemesPayload())),
} } });
