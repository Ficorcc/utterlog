import { createFileRoute } from '@tanstack/react-router';
import { saveLinkEmails, suggestLinkEmails } from '@backend/services/friend-links';
import { apiOk, withAdmin } from '../../../../server/http';

/**
 * 友链邮箱匹配。GET 出建议，PUT 存人工确认过的结果。
 *
 * 分成两步是有意的：域名匹配再准也只是猜测，把陌生人的邮箱写进友链表得由人点头。
 */
export const Route = createFileRoute('/api/v1/admin/link-emails')({ server: { handlers: {
  GET: ({ request }) => withAdmin(request, async () => apiOk({ suggestions: await suggestLinkEmails() })),
  PUT: ({ request }) => withAdmin(request, async () => {
    const body = await request.json().catch(() => ({})) as { updates?: { linkId?: number; email?: string }[] };
    const updates = Array.isArray(body.updates) ? body.updates : [];
    const saved = await saveLinkEmails(updates.map((item) => ({
      linkId: Number(item?.linkId) || 0,
      email: String(item?.email || ''),
    })));
    return apiOk({ saved });
  }),
} } });
