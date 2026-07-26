import { beforeAll, describe, expect, mock, test } from 'bun:test';

/**
 * 评论和友链接口的对外字段边界。
 *
 * 起因是线上实测：`/api/v1/comments` 对匿名访客把每条评论的 author_email 和
 * author_ip 原样返回了 —— 接口是 `select c.*` 再整行摊平，任何人 curl 一次
 * 就能把全站评论者的邮箱和 IP 拖走。友链表的 email 同理，它是拿来算 Gravatar
 * 的，一旦从评论回填了一批，`select *` 就等于把站长邮箱挂上公网。
 *
 * 这两处都靠「登录与否」分流，所以两个方向都要测：匿名必须拿不到，后台必须
 * 拿得到（友链编辑表单要回填邮箱、评论管理要显示 IP）。
 */

const COMMENT_ROW = {
  id: 7,
  post_id: 31,
  parent_id: 0,
  author_name: '织梦岁月',
  author_email: 'friend@example.com',
  author_url: 'https://friend.example.com',
  author_ip: '203.0.113.9',
  author_agent: 'Mozilla/5.0 (Macintosh)',
  client_hints: '{"platform":"macOS"}',
  visitor_id: 'v-abcdef',
  content: '写得好',
  status: 'approved',
  created_at: 1_700_000_000,
  geo: null,
  user_role: '',
};

const LINK_ROW = {
  id: 3,
  name: '友链好友',
  url: 'https://friend.example.com',
  email: 'friend@example.com',
  logo: '',
  status: 1,
  order_num: 1,
};

mock.module('../src/backend/db/helpers', () => ({
  one: async (query: string) => {
    if (query.includes('count(*)')) return { count: '1' };
    return query.includes('links') ? LINK_ROW : null;
  },
  many: async (query: string) => {
    if (query.includes('links')) return [LINK_ROW];
    if (query.includes('comments')) return [COMMENT_ROW];
    return [];
  },
  exec: async () => ({ count: 1 }),
  nowUnix: () => 1_700_000_000,
  intParam: (value: string | undefined, fallback = 0) => Number(value ?? fallback) || fallback,
  pageParams: () => ({ page: 1, perPage: 20 }),
}));

mock.module('../src/backend/db/options', () => ({
  optionValue: async (_name: string, fallback = '') => fallback,
  saveOption: async () => {},
  readOptionMap: async () => ({}),
}));

let publicRead: typeof import('../src/backend/public-read');
let contentRecords: typeof import('../src/backend/services/content-records');

beforeAll(async () => {
  publicRead = await import('../src/backend/public-read');
  contentRecords = await import('../src/backend/services/content-records');
});

/** 敏感字段要么整个不存在，要么是空的 —— 两种都算堵住了。 */
function expectRedacted(row: Record<string, unknown>, field: string) {
  expect(row[field] === undefined || row[field] === '' || row[field] === null).toBe(true);
}

describe('评论接口对匿名访客脱敏', () => {
  test('邮箱、IP、客户端指纹都不出现在响应里', async () => {
    const result = await publicRead.listComments({ postId: 31 });
    const row = result.data[0] as Record<string, unknown>;
    for (const field of ['author_email', 'email', 'author_ip', 'ip', 'client_hints', 'visitor_id']) {
      expectRedacted(row, field);
    }
  });

  test('脱敏之后头像照样有 —— Gravatar 是服务端算好的，不需要把邮箱发出去', async () => {
    const result = await publicRead.listComments({ postId: 31 });
    const row = result.data[0] as Record<string, unknown>;
    expect(String(row.avatar_url)).toContain('gravatar');
    // 算 Gravatar 用的是 md5，明文邮箱不该出现在 URL 里
    expect(String(row.avatar_url)).not.toContain('friend@example.com');
  });

  test('UA 保留 —— 前台评论上的「系统 · 浏览器」靠它渲染', async () => {
    const result = await publicRead.listComments({ postId: 31 });
    const row = result.data[0] as Record<string, unknown>;
    expect(String(row.user_agent)).toContain('Mozilla');
  });

  test('文章页那条独立的评论查询也要脱敏', async () => {
    const rows = await publicRead.listPostComments(31);
    for (const field of ['author_email', 'email', 'author_ip', 'ip', 'client_hints', 'visitor_id']) {
      expectRedacted(rows[0] as Record<string, unknown>, field);
    }
  });

  test('登录后（后台评论管理）仍然拿得到邮箱和 IP', async () => {
    const result = await publicRead.listComments({ postId: 31, authed: true });
    const row = result.data[0] as Record<string, unknown>;
    expect(row.author_email).toBe('friend@example.com');
    expect(row.email).toBe('friend@example.com');
    expect(row.author_ip).toBe('203.0.113.9');
  });
});

describe('评论上的友链标记', () => {
  test('命中友链时带出名字，但绝不带邮箱', async () => {
    const result = await publicRead.listComments({ postId: 31 });
    const friend = (result.data[0] as Record<string, unknown>).friend as Record<string, unknown> | null;
    expect(friend).toBeTruthy();
    expect(friend?.name).toBe('友链好友');
    expect(JSON.stringify(friend)).not.toContain('friend@example.com');
  });

  test('整条响应序列化后不含任何邮箱明文', async () => {
    const result = await publicRead.listComments({ postId: 31 });
    expect(JSON.stringify(result)).not.toContain('friend@example.com');
  });
});

describe('友链接口的邮箱边界', () => {
  test('匿名拿不到 email，但拿得到算好的头像', async () => {
    const result = await contentRecords.listContentRecords('links', {});
    const row = result.rows[0] as Record<string, unknown>;
    expect(row.email).toBeUndefined();
    expect(String(row.avatar)).toContain('gravatar');
    expect(JSON.stringify(result)).not.toContain('friend@example.com');
  });

  test('后台保留 email —— 友链编辑表单要回填', async () => {
    const result = await contentRecords.listContentRecords('links', { authed: true });
    const row = result.rows[0] as Record<string, unknown>;
    expect(row.email).toBe('friend@example.com');
  });

  test('单条读取同样按登录态分流', async () => {
    const anon = await contentRecords.getContentRecord('links', '3', false) as Record<string, unknown>;
    expect(anon?.email).toBeUndefined();
    const admin = await contentRecords.getContentRecord('links', '3', true) as Record<string, unknown>;
    expect(admin?.email).toBe('friend@example.com');
  });
});
