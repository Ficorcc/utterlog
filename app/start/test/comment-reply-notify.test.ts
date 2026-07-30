import { beforeAll, describe, expect, mock, test } from 'bun:test';

/**
 * 管理员在后台回复评论后的邮件通知。
 *
 * 起因：用户报「后台回复没发邮件」，排查时发现代码路径、SMTP、条件判断全都正常，
 * 但**根本查不出历史上发没发** —— 发信是 `.catch(() => {})`，成功不记、失败也不记，
 * 后台永远只显示「回复成功」。
 *
 * 所以这里锁的不是「一定发得出去」（那取决于外部 SMTP），而是**结果必须被如实回报**：
 * 发了就说发给了谁，没发就说清为什么。
 */

const NOW = 1_800_000_000;

let sendCalls: { to: string; subject: string }[] = [];
let sendBehavior: 'ok' | 'throw' = 'ok';
let optedOut = new Set<string>();

const PARENT = {
  post_id: 31,
  author_name: 'Huo',
  author_email: 'visitor@example.com',
  content: '原评论',
  created_at: NOW - 3600,
  role: '',
};
const ADMIN = { email: 'admin@example.com', username: 'panyuye', nickname: '西风' };

mock.module('../src/backend/db/helpers', () => ({
  one: async (sql: string) => {
    if (sql.includes('from') && sql.includes('users') && sql.includes('where id')) return ADMIN;
    if (sql.includes('title, slug')) return { title: '一篇文章', slug: 'hello' };
    return PARENT;
  },
  many: async () => [{ id: 999 }],
  exec: async () => ({ count: 1 }),
  nowUnix: () => NOW,
  intParam: (v: string | undefined, f = 0) => Number(v ?? f) || f,
  pageParams: () => ({ page: 1, perPage: 20 }),
}));

mock.module('../src/backend/db/options', () => ({
  optionValue: async (name: string, fallback = '') => (name === 'site_url' ? 'https://example.com' : fallback),
  saveOption: async () => {},
  readOptionMap: async () => ({}),
}));

mock.module('../src/backend/email', () => ({
  sendConfiguredEmail: async (to: string, subject: string) => {
    sendCalls.push({ to, subject });
    if (sendBehavior === 'throw') throw new Error('535 认证失败');
  },
}));

mock.module('../src/backend/email/comment-reply-unsubscribe', () => ({
  isCommentReplyOptedOut: async (email: string) => optedOut.has(email),
  commentReplyUnsubscribeUrl: async () => 'https://example.com/unsub?token=x',
  addCommentReplyOptout: async () => {},
}));

let mod: typeof import('../src/backend/services/comments');

beforeAll(async () => {
  mod = await import('../src/backend/services/comments');
});

function reset() {
  sendCalls = [];
  sendBehavior = 'ok';
  optedOut = new Set();
  PARENT.author_email = 'visitor@example.com';
  PARENT.role = '';
}

describe('管理员回复后的通知结果', () => {
  test('正常情况：发出去了，并把收件人回给后台', async () => {
    reset();
    const res = await mod.replyToAdminComment(574, 1, { content: '谢谢来访' }) as any;
    expect(res.id).toBe(999);
    expect(res.notified).toBe(true);
    expect(res.notifiedTo).toBe('visitor@example.com');
    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0].to).toBe('visitor@example.com');
  });

  test('发信抛错时回复照样成功，但必须如实说没通知到 —— 不能再吞掉', async () => {
    reset();
    sendBehavior = 'throw';
    const res = await mod.replyToAdminComment(574, 1, { content: '谢谢来访' }) as any;
    // 评论本身要写进去，不能因为发信失败就整个回滚
    expect(res.id).toBe(999);
    expect(res.notified).toBe(false);
    expect(res.notifyReason).toContain('535');
  });

  test('对方没留邮箱：说清原因，不做无谓的发信尝试', async () => {
    reset();
    PARENT.author_email = '';
    const res = await mod.replyToAdminComment(574, 1, { content: 'hi' }) as any;
    expect(res.notified).toBe(false);
    expect(res.notifyReason).toContain('邮箱');
    expect(sendCalls).toHaveLength(0);
  });

  test('对方已退订：不发，并说明是退订', async () => {
    reset();
    optedOut.add('visitor@example.com');
    const res = await mod.replyToAdminComment(574, 1, { content: 'hi' }) as any;
    expect(res.notified).toBe(false);
    expect(res.notifyReason).toContain('退订');
    expect(sendCalls).toHaveLength(0);
  });

  test('回复管理员自己的评论：不给自己发信', async () => {
    reset();
    PARENT.role = 'admin';
    const res = await mod.replyToAdminComment(574, 1, { content: 'hi' }) as any;
    expect(res.notified).toBe(false);
    expect(sendCalls).toHaveLength(0);
  });

  test('收件人正好是当前管理员邮箱：不自己发给自己', async () => {
    reset();
    PARENT.author_email = 'admin@example.com';
    const res = await mod.replyToAdminComment(574, 1, { content: 'hi' }) as any;
    expect(res.notified).toBe(false);
    expect(sendCalls).toHaveLength(0);
  });

  test('任何一种跳过都要给出原因，后台才有话可显示', async () => {
    for (const setup of [
      () => { PARENT.author_email = ''; },
      () => { optedOut.add('visitor@example.com'); },
      () => { PARENT.role = 'admin'; },
      () => { PARENT.author_email = 'admin@example.com'; },
      () => { sendBehavior = 'throw'; },
    ]) {
      reset();
      setup();
      const res = await mod.replyToAdminComment(574, 1, { content: 'hi' }) as any;
      expect(res.notified).toBe(false);
      expect(String(res.notifyReason || '')).not.toBe('');
    }
  });
});

describe('回复者不限于管理员', () => {
  // 前台评论框此前完全没有回复通知 —— 无论访客之间还是博主在文章页下回复，
  // 被回复的人都收不到提醒，评论区根本对话不起来。
  test('游客回复游客也要通知，回复者署名用游客昵称', async () => {
    reset();
    const res = await mod.notifyCommentReply({
      parent: { ...PARENT },
      replier: { name: '路过的人', email: 'passerby@example.com' },
      replyId: 1001,
      content: '我也遇到过这个问题',
      now: NOW,
    });
    expect(res.notified).toBe(true);
    expect(res.notifiedTo).toBe('visitor@example.com');
    expect(sendCalls).toHaveLength(1);
  });

  test('自己回复自己不发 —— 邮箱相同就跳过', async () => {
    reset();
    const res = await mod.notifyCommentReply({
      parent: { ...PARENT },
      replier: { name: 'Huo', email: 'visitor@example.com' },
      replyId: 1002,
      content: '补充一句',
      now: NOW,
    });
    expect(res.notified).toBe(false);
    expect(res.notifyReason).toContain('自己');
    expect(sendCalls).toHaveLength(0);
  });

  test('被回复的是博主时不发 —— 博主已经有「新评论」通知，别发两封', async () => {
    reset();
    const res = await mod.notifyCommentReply({
      parent: { ...PARENT, role: 'admin' },
      replier: { name: '访客', email: 'guest@example.com' },
      replyId: 1003,
      content: '请教一下',
      now: NOW,
    });
    expect(res.notified).toBe(false);
    expect(sendCalls).toHaveLength(0);
  });

  test('回复者没留邮箱照样能通知对方 —— 别因为回复者匿名就不发', async () => {
    reset();
    const res = await mod.notifyCommentReply({
      parent: { ...PARENT },
      replier: { name: '匿名', email: '' },
      replyId: 1004,
      content: '同问',
      now: NOW,
    });
    expect(res.notified).toBe(true);
    expect(sendCalls).toHaveLength(1);
  });
});
