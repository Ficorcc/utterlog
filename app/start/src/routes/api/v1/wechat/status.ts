import { createFileRoute } from '@tanstack/react-router';
import { wechatGatewayHealth } from '@backend/wechat';
import { apiOk, withAdmin } from '../../../../server/http';

/** 网关状态：登录状态、微信号、使用的 puppet。 */
export const Route = createFileRoute('/api/v1/wechat/status')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => apiOk(await wechatGatewayHealth())),
} } });
