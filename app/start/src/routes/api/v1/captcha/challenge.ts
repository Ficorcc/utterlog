import { createFileRoute } from '@tanstack/react-router';
import { createCommentCaptchaChallenge } from '../../../../../../server/src/services/comment-captcha';
import { apiOk } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/captcha/challenge')({
  server: { handlers: { GET: async () => apiOk(await createCommentCaptchaChallenge()) } },
});
