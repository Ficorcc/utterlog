import { createFileRoute } from '@tanstack/react-router';
import { getOnThisDayPosts } from '@backend/public-read';
import { apiOk } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/posts/$id/on-this-day')({ server: { handlers: { GET: async ({ params }) => apiOk(await getOnThisDayPosts(Number(params.id))) } } });
