import { createFileRoute } from '@tanstack/react-router';
import { listPostComments } from '../../../../../../../server/src/public-read';
import { apiOk } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/posts/$id/comments')({ server: { handlers: { GET: async ({ params }) => apiOk(await listPostComments(Number(params.id))) } } });
