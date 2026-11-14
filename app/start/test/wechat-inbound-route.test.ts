/**
 * 微信入站路由的 HTTP 契约测试。
 *
 * 网关 → 站点这一跳全是 HTTP，字段名拼错、鉴权头写错，运行时才炸。
 * 这里起一个真的 HTTP 服务，把网关实际发来的报文格式打进去，验三件事：
 *   1. 正确的共享密钥能进，错的进不来
 *   2. 网关的报文能原样解析成 WechatInboundMessage
 *   3. 缺发送者 ID 时是 400 而不是 500
 *
 * 处理器与密钥来源都是注入的，不用 mock.module（全局污染）。
 */

import { afterAll, describe, expect, test } from 'bun:test';
import { WechatServiceError, type WechatInboundMessage } from '../src/backend/routes/wechat';
import { createWechatInboundHandler } from '../src/routes/api/v1/wechat/inbound';

const captured: WechatInboundMessage[] = [];

const handler = createWechatInboundHandler(
  async (message) => {
    captured.push(message);
    if (!message?.from) {
      throw new WechatServiceError(400, 'VALIDATION_ERROR', '缺少发送者 ID');
    }
    return { ok: true };
  },
  async () => 'secret-123',
);

const server = Bun.serve({
  port: 0,
  fetch: async (request) => await handler(request),
});

const base = `http://127.0.0.1:${server.port}`;

afterAll(() => {
  server.stop(true);
});

describe('POST /api/v1/wechat/inbound', () => {
  test('网关报文能被原样解析', async () => {
    captured.length = 0;
    const payload = {
      id: 'msg-1',
      from: 'wxid_owner',
      fromName: '西风',
      roomId: '',
      roomName: '',
      text: '/help',
      type: 'text',
      imageUrl: '',
      timestamp: 1794698000000,
    };
    const res = await fetch(`${base}/api/v1/wechat/inbound`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-wechat-token': 'secret-123' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(captured.length).toBe(1);
    expect(captured[0].from).toBe('wxid_owner');
    expect(captured[0].text).toBe('/help');
    expect(captured[0].type).toBe('text');
  });

  test('密钥不对时拒绝，且不会触达处理器', async () => {
    captured.length = 0;
    const res = await fetch(`${base}/api/v1/wechat/inbound`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-wechat-token': 'wrong' },
      body: JSON.stringify({ from: 'wxid_x', text: '/help' }),
    });
    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.success).toBe(false);
    expect(captured.length).toBe(0);
  });

  test('缺少密钥头同样被拒', async () => {
    captured.length = 0;
    const res = await fetch(`${base}/api/v1/wechat/inbound`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'wxid_x', text: '/help' }),
    });
    expect(res.status).toBe(403);
    expect(captured.length).toBe(0);
  });

  test('报文不完整时返回 400 而不是 500', async () => {
    const res = await fetch(`${base}/api/v1/wechat/inbound`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-wechat-token': 'secret-123' },
      body: JSON.stringify({ text: '/help' }),
    });
    expect(res.status).toBe(400);
  });
});
