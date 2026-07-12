import { createFileRoute } from '@tanstack/react-router';
import { createCommentImageCaptcha } from '../../../../../../server/src/services/comment-captcha';
import { apiOk, withPublicWrite } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/captcha/image')({
  server: { handlers: { GET: ({ request }) => withPublicWrite(async () => {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || forwarded || '127.0.0.1';
    return apiOk(await createCommentImageCaptcha(ip));
  }) } },
});
