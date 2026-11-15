import { createFileRoute } from '@tanstack/react-router';
import {
  COMMENT_LIKE_COOKIE,
  CommentLikeServiceError,
  readCommentLikeToken,
  toggleCommentLike,
} from '@backend/services/comment-likes';
import { apiFail, apiOk } from '../../../../../server/http';

export const Route = createFileRoute('/api/v1/comments/$id/like')({
  server: { handlers: {
    POST: async ({ request, params }) => {
      try {
        const visitor = readCommentLikeToken(request);
        const response = apiOk(await toggleCommentLike(Number(params.id), visitor.value));
        if (visitor.created) {
          const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
          response.headers.set('set-cookie', `${COMMENT_LIKE_COOKIE}=${visitor.value}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
        }
        return response;
      } catch (err) {
        if (err instanceof CommentLikeServiceError) {
          return apiFail(err.status, err.code, err.message);
        }
        throw err;
      }
    },
  } },
});
