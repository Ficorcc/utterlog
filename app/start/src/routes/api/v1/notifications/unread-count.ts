import { createFileRoute } from '@tanstack/react-router';
import { unreadNotificationCount } from '../../../../../../server/src/services/notifications';
import { apiOk, withAdmin } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/notifications/unread-count')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async (session) => apiOk({ count: await unreadNotificationCount(session.userId) })),
} } });
