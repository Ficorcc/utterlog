import { createFileRoute } from '@tanstack/react-router';
import { getPostById } from '../../../../../../server/src/public-read';
import { apiFail, apiOk } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/posts/$id')({ server: { handlers: { GET: async ({ request, params }) => {
  const post = await getPostById(Number(params.id), new URL(request.url).searchParams.get('track') === '1');
  return post ? apiOk(post) : apiFail(404, 'NOT_FOUND', '文章 not found');
} } } });
