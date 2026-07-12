import { createFileRoute } from '@tanstack/react-router';
import { listPostEpisodes } from '../../../../../../../server/src/public-read';
import { apiFail, apiOk } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/posts/$id/episodes')({ server: { handlers: { GET: async ({ params }) => {
  const result = await listPostEpisodes(Number(params.id));
  return result ? apiOk(result) : apiFail(404, 'NOT_FOUND', '文章 not found');
} } } });
