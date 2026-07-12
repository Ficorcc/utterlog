import { createFileRoute } from '@tanstack/react-router';
import { commentReplyUnsubscribeResponse } from '../../../../../../server/src/services/unsubscribe';

export const Route = createFileRoute('/api/v1/unsubscribe/comment-reply')({ server: { handlers: {
  GET: ({ request }) => commentReplyUnsubscribeResponse(new URL(request.url).searchParams),
} } });
