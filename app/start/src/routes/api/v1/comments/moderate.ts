import { createFileRoute } from '@tanstack/react-router';
import { commentModerationResponse } from '@backend/services/comment-moderation';

/**
 * 通知邮件里的一键审核。GET 渲染确认页、POST 才落库 —— 邮件网关会自动预取
 * 链接做安全扫描，GET 直接生效等于让扫描器替你审批。
 */
export const Route = createFileRoute('/api/v1/comments/moderate')({
  server: {
    handlers: {
      GET: ({ request }) => commentModerationResponse(new URL(request.url).searchParams, 'GET'),
      POST: async ({ request }) => {
        // 确认页用表单提交，参数在 body 里；也兼容直接带 query 的 POST。
        const form = await request.formData().catch(() => null);
        const params = new URL(request.url).searchParams;
        if (form) {
          for (const key of ['c', 'a', 'e', 't']) {
            const value = form.get(key);
            if (typeof value === 'string' && value) params.set(key, value);
          }
        }
        return commentModerationResponse(params, 'POST');
      },
    },
  },
});
