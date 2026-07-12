import { createFileRoute } from '@tanstack/react-router';
import { authenticateRequest } from '../../../../../../server/src/auth/session';
import { socialFeedStats } from '../../../../../../server/src/routes/compat';
import { apiOk } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/social/feed-stats')({ server: { handlers: {
  GET: async ({ request }) => {
    const session = await authenticateRequest(request).catch(() => null);
    return apiOk(await socialFeedStats(session?.userId || 1));
  },
} } });
