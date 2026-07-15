import { createFileRoute } from '@tanstack/react-router';
import { createCommentImageCaptcha } from '../../../../../../server/src/services/comment-captcha';
import { requestIp } from '../../../../../../server/src/request-ip';
import { apiOk, withPublicWrite } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/captcha/image')({
  server: { handlers: { GET: ({ request }) => withPublicWrite(async () => {
    return apiOk(await createCommentImageCaptcha(requestIp(request)));
  }) } },
});
