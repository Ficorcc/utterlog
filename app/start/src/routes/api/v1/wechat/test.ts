import { createFileRoute } from '@tanstack/react-router';
import { testWechatConnection, WechatServiceError } from '@backend/routes/wechat';
import { apiFail, apiOk, withAdmin } from '../../../../server/http';

/** 后台「测试连接」：给主人发一条测试消息。 */
export const Route = createFileRoute('/api/v1/wechat/test')({ server: { handlers: {
  POST: ({ request }) => withAdmin(request, async () => {
    try {
      return apiOk(await testWechatConnection());
    } catch (error) {
      if (error instanceof WechatServiceError) return apiFail(error.status, error.code, error.message);
      throw error;
    }
  }),
} } });
