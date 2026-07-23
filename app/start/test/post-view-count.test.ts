import { beforeAll, expect, mock, test } from 'bun:test';

// 阅读量的写入口只有一条：文章详情页 SSR 读取时 +1。这里把 db helpers 换成
// 探针，确认 UPDATE 真的发出、去重窗口内不重复发、爬虫 UA 不发。
const statements: { sql: string; params: unknown[] }[] = [];

mock.module('../src/backend/db/helpers', () => ({
  nowUnix: () => Math.floor(Date.now() / 1000),
  one: async () => null,
  many: async () => [],
  exec: async (sql: string, params: unknown[] = []) => {
    statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    return { count: 1 };
  },
}));

const chromeUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

let bumpPostViewOnRead: typeof import('../src/backend/services/tracking')['bumpPostViewOnRead'];
let readVisitorFromRequest: typeof import('../src/backend/services/tracking')['readVisitorFromRequest'];

beforeAll(async () => {
  ({ bumpPostViewOnRead, readVisitorFromRequest } = await import('../src/backend/services/tracking'));
});

test('a browser read bumps view_count exactly once inside the dedup window', async () => {
  statements.length = 0;
  const reader = { ip: '203.0.113.9', ua: chromeUa };

  expect(await bumpPostViewOnRead(41, reader)).toBe(true);
  expect(statements).toHaveLength(1);
  expect(statements[0].sql).toContain('set view_count=coalesce(view_count,0)+1');
  expect(statements[0].sql).toContain(`type='post' and status='publish'`);
  expect(statements[0].params).toEqual([41]);

  // 同一读者同一篇文章，30 秒去重窗口内不再累加。
  expect(await bumpPostViewOnRead(41, reader)).toBe(false);
  expect(statements).toHaveLength(1);

  // 换一篇文章仍然计数，去重是按 (读者, 文章) 而不是按读者。
  expect(await bumpPostViewOnRead(42, reader)).toBe(true);
  expect(statements).toHaveLength(2);
});

test('bots and unusable post ids never touch view_count', async () => {
  statements.length = 0;
  expect(await bumpPostViewOnRead(51, { ip: '203.0.113.10', ua: 'Googlebot/2.1 (+http://www.google.com/bot.html)' })).toBe(false);
  expect(await bumpPostViewOnRead(52, { ip: '203.0.113.11', ua: '' })).toBe(false);
  expect(await bumpPostViewOnRead(0, { ip: '203.0.113.12', ua: chromeUa })).toBe(false);
  expect(statements).toHaveLength(0);
});

test('readVisitorFromRequest takes the proxied client ip, not the peer', () => {
  const request = new Request('https://example.com/archives/29', {
    headers: { 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '10.0.0.1', 'user-agent': chromeUa },
  });
  expect(readVisitorFromRequest(request)).toEqual({ ip: '198.51.100.7', ua: chromeUa });
});
