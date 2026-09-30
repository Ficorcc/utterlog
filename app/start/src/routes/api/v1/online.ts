import { createFileRoute } from '@tanstack/react-router';
import { publicOnlineSummary, publicOnlineVisitors } from '@backend/services/tracking';
import { apiOk } from '../../../server/http';

export const Route = createFileRoute('/api/v1/online')({ server: { handlers: {
  GET: async ({ request }) => apiOk(new URL(request.url).searchParams.get('summary') === '1'
    ? await publicOnlineSummary()
    : await publicOnlineVisitors()),
} } });
