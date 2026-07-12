import { createFileRoute } from '@tanstack/react-router';
import { adminAnalyticsStatsPayload } from '../../../../../../../server/src/routes/compat';
import { apiOk, withAdmin } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/admin/analytics/stats')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => apiOk(await adminAnalyticsStatsPayload())),
} } });
