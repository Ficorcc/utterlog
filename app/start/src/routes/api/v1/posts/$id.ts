import { createFileRoute } from '@tanstack/react-router';
import { authenticateRequest } from '../../../../../../server/src/auth/session';
import { getPostById } from '../../../../../../server/src/public-read';
import { apiFail, apiOk } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/posts/$id')({ server: { handlers: { GET: async ({ request, params }) => {
  const session = await authenticateRequest(request).catch(() => null);
  const post = await getPostById(Number(params.id), new URL(request.url).searchParams.get('track') === '1', Boolean(session));
  return post ? apiOk(post) : apiFail(404, 'NOT_FOUND', '文章 not found');
} } } });
