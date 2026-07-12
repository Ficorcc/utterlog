import { createFileRoute } from '@tanstack/react-router';
import { listFootprintPlaces } from '../../../../../../../server/src/services/footprints';
import { apiOk, withAdmin } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/admin/footprints/places')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => {
    return apiOk(await listFootprintPlaces(new URL(request.url).searchParams.get('search') || ''));
  }),
} } });
