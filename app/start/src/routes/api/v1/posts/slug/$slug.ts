import { createFileRoute } from '@tanstack/react-router';
import { getPostBySlug } from '../../../../../../../server/src/public-read';
import { apiFail, apiOk } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/posts/slug/$slug')({ server: { handlers: { GET: async ({ request, params }) => {
  const post = await getPostBySlug(decodeURIComponent(params.slug), new URL(request.url).searchParams.get('track') === '1');
  return post ? apiOk(post) : apiFail(404, 'NOT_FOUND', '文章 not found');
} } } });
