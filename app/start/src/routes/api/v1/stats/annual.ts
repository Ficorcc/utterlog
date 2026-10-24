import { createFileRoute } from '@tanstack/react-router';
import { getAnnualReport } from '@backend/public-read';
import { apiOk } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/stats/annual')({
  server: { handlers: {
    GET: async ({ request }) => {
      const year = Number(new URL(request.url).searchParams.get('year') || '');
      return apiOk(await getAnnualReport(year));
    },
  } },
});
