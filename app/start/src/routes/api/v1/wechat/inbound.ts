import { createFileRoute } from '@tanstack/react-router';
import { optionValue } from '@backend/db/options';
import { processWechatInbound, type WechatInboundMessage, WechatServiceError } from '@backend/routes/wechat';
import { apiFail, apiOk } from '../../../../server/http';

/**
 * 微信网关回调入口。
 *
 * 网关收到微信消息后，把规范化后的 JSON POST 到这里；
 * 用 x-wechat-token 头带共享密钥，密钥取自站点的 wechat_gateway_token。
 *
 * 处理函数做成工厂是为了能单测：不 mock 全局模块，直接传假的处理器与密钥来源。
 */
export function createWechatInboundHandler(
  processor: (message: WechatInboundMessage) => Promise<unknown>,
  resolveToken: () => Promise<string>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const secret = (await resolveToken()).trim();
      const provided = String(request.headers.get('x-wechat-token') || '').trim();
      if (secret && provided !== secret) {
        return apiFail(403, 'FORBIDDEN', 'Invalid WeChat gateway token');
      }
      const body = await request.json().catch(() => ({})) as WechatInboundMessage;
      return apiOk(await processor(body));
    } catch (error) {
      if (error instanceof WechatServiceError) return apiFail(error.status, error.code, error.message);
      console.error('WeChat inbound error:', error);
      return apiFail(500, 'INTERNAL_ERROR', '微信消息处理失败');
    }
  };
}

export const Route = createFileRoute('/api/v1/wechat/inbound')({ server: { handlers: {
  POST: async ({ request }) => await createWechatInboundHandler(
    processWechatInbound,
    () => optionValue('wechat_gateway_token', ''),
  )(request),
} } });
