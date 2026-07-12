import { createFileRoute } from '@tanstack/react-router';
import { getOptionsMap } from '../../../../../server/src/public-read';
import { apiOk } from '../../../server/http';

export const Route = createFileRoute('/api/v1/options')({
  server: { handlers: { GET: async () => apiOk(await getOptionsMap()) } },
});
