import { beforeAll, describe, expect, mock, test } from 'bun:test';

// 一键审核链接的签名。这套 token 直接决定「谁能改评论状态」，所以把
// 篡改、过期、跨动作复用这几条全部锁住。
const options = new Map<string, string>();
mock.module('../src/backend/db/options', () => ({
  optionValue: async (name: string, fallback = '') => options.get(name) ?? fallback,
  saveOption: async (name: string, value: string) => { options.set(name, value); },
}));
mock.module('../src/backend/db/helpers', () => ({
  nowUnix: () => Math.floor(Date.now() / 1000),
  one: async () => null,
  many: async () => [],
  exec: async () => ({ count: 0 }),
}));

let mod: typeof import('../src/backend/email/comment-moderation');

beforeAll(async () => {
  mod = await import('../src/backend/email/comment-moderation');
});

function paramsOf(url: string) {
  const query = new URL(url).searchParams;
  return {
    c: query.get('c'), a: query.get('a'), e: query.get('e'), t: query.get('t'),
  };
}

describe('评论一键审核 token', () => {
  test('正常链接可以通过校验', async () => {
    const url = await mod.commentModerationUrl('https://xifeng.net', 42, 'approve');
    expect(url).toContain('/api/v1/comments/moderate');
    const p = paramsOf(url);
    const claim = await mod.verifyCommentModeration(p.c, p.a, p.e, p.t);
    expect(claim).toEqual({ commentId: 42, action: 'approve', expiresAt: Number(p.e) });
  });

  test('改评论 ID 会失效 —— 不能拿一条的链接去动另一条', async () => {
    const url = await mod.commentModerationUrl('https://xifeng.net', 42, 'approve');
    const p = paramsOf(url);
    expect(await mod.verifyCommentModeration('43', p.a, p.e, p.t)).toBeNull();
  });

  test('改动作会失效 —— 拿「通过」的链接变不出「标记垃圾」', async () => {
    const url = await mod.commentModerationUrl('https://xifeng.net', 42, 'approve');
    const p = paramsOf(url);
    expect(await mod.verifyCommentModeration(p.c, 'spam', p.e, p.t)).toBeNull();
  });

  test('改过期时间会失效 —— 不能自己把有效期往后延', async () => {
    const url = await mod.commentModerationUrl('https://xifeng.net', 42, 'approve');
    const p = paramsOf(url);
    const later = String(Number(p.e) + 86400);
    expect(await mod.verifyCommentModeration(p.c, p.a, later, p.t)).toBeNull();
  });

  test('过期链接返回 expired 而不是当成有效', async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const url = await mod.commentModerationUrl('https://xifeng.net', 42, 'spam', past);
    const p = paramsOf(url);
    expect(await mod.verifyCommentModeration(p.c, p.a, p.e, p.t)).toBe('expired');
  });

  test('缺参数、乱填签名一律拒绝', async () => {
    expect(await mod.verifyCommentModeration('42', 'approve', '9999999999', '')).toBeNull();
    expect(await mod.verifyCommentModeration('42', 'approve', '9999999999', 'forged')).toBeNull();
    expect(await mod.verifyCommentModeration('', '', '', '')).toBeNull();
    // 动作白名单之外的一律不认，别指望能塞个 delete 进来
    expect(await mod.verifyCommentModeration('42', 'delete', '9999999999', 'x')).toBeNull();
    expect(mod.isModerationAction('delete')).toBe(false);
    expect(mod.isModerationAction('approve')).toBe(true);
  });

  test('评论 ID 非法时不生成链接', async () => {
    expect(await mod.commentModerationUrl('https://xifeng.net', 0, 'approve')).toBe('');
    expect(await mod.commentModerationUrl('https://xifeng.net', -1, 'spam')).toBe('');
  });

  test('密钥自动生成并复用，不会每次签出不同结果', async () => {
    const a = await mod.commentModerationUrl('https://xifeng.net', 7, 'approve', 9999999999);
    const b = await mod.commentModerationUrl('https://xifeng.net', 7, 'approve', 9999999999);
    expect(a).toBe(b);
    expect(options.get('comment_moderation_secret')).toBeTruthy();
  });
});
