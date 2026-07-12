import { createFileRoute } from '@tanstack/react-router';
import { getPostByDisplayId } from '../../../../../../../server/src/public-read';
import { apiFail, apiOk } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/posts/by-display-id/$displayId')({ server: { handlers: { GET: async ({ request, params }) => {
  const post = await getPostByDisplayId(Number(params.displayId), new URL(request.url).searchParams.get('track') === '1');
  return post ? apiOk(post) : apiFail(404, 'NOT_FOUND', '文章 not found');
} } } });
