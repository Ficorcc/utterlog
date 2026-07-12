import { createFileRoute } from '@tanstack/react-router';
import { socialFeedFetchStatus } from '../../../../../../../server/src/routes/compat';
import { apiOk, withAdmin } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/social/fetch-feeds/status')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => apiOk(socialFeedFetchStatus())),
} } });
