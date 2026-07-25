import { beforeAll, expect, mock, test } from 'bun:test';

// 阅读量的写入口只有一条：文章详情页 SSR 读取时 +1，累计数和按天明细都从
// 那里写。口径是页面加载量，刷新照样累加。这里把 db helpers 换成探针，确认
// UPDATE 真的发出、刷新会再发、按天明细跟着一起写、爬虫 UA 不发。
const statements: { sql: string; params: unknown[] }[] = [];

mock.module('../src/backend/db/helpers', () => ({
  nowUnix: () => Math.floor(Date.now() / 1000),
  one: async (sql: string, params: unknown[] = []) => {
    statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    return null;
  },
  many: async () => [],
  exec: async (sql: string, params: unknown[] = []) => {
    statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    return { count: 1 };
  },
}));

const viewCountStatements = () => statements.filter((s) => s.sql.includes('set view_count=coalesce(view_count,0)+1'));
const postDailyStatements = () => statements.filter((s) => s.sql.includes('stats_post_daily'));

const chromeUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

let bumpPostViewOnRead: typeof import('../src/backend/services/tracking')['bumpPostViewOnRead'];
let readVisitorFromRequest: typeof import('../src/backend/services/tracking')['readVisitorFromRequest'];

beforeAll(async () => {
  ({ bumpPostViewOnRead, readVisitorFromRequest } = await import('../src/backend/services/tracking'));
});

test('every page load bumps view_count, refreshes included', async () => {
  statements.length = 0;
  const reader = { ip: '203.0.113.9', ua: chromeUa };

  expect(await bumpPostViewOnRead(41, reader)).toBe(true);
  const bumps = viewCountStatements();
  expect(bumps).toHaveLength(1);
  expect(bumps[0].sql).toContain(`type='post' and status='publish'`);
  expect(bumps[0].params).toEqual([41]);

  // 口径是页面加载量：同一个读者立刻刷新同一篇文章，照样 +1，没有时间
  // 窗口去重。这条是需求本身，不是实现细节。
  expect(await bumpPostViewOnRead(41, reader)).toBe(true);
  expect(await bumpPostViewOnRead(41, reader)).toBe(true);
  expect(viewCountStatements()).toHaveLength(3);
  expect(viewCountStatements().every((s) => s.params[0] === 41)).toBe(true);

  // 按天明细跟着一起涨，views 和累计数是同一个节奏。
  expect(postDailyStatements()).toHaveLength(3);
});

test('the by-day rollup is written by the same call that bumps view_count', async () => {
  statements.length = 0;
  expect(await bumpPostViewOnRead(43, { ip: '203.0.113.20', ua: chromeUa })).toBe(true);

  // 累计数和按天明细必须成对出现，这是两个数字永远对得上的前提。
  expect(viewCountStatements()).toHaveLength(1);
  const daily = postDailyStatements();
  expect(daily).toHaveLength(1);
  expect(daily[0].params[0]).toBe(43);

  // 唯一访客先落 stats_visitor_post_dates，拿 (xmax=0) 判断今天是不是新访客。
  const visitorRow = statements.find((s) => s.sql.includes('stats_visitor_post_dates'));
  expect(visitorRow?.sql).toContain('(xmax=0) as inserted');
  expect(visitorRow?.params[1]).toBe(43);
  // SSR 拿不到 localStorage 的 visitor_id，这里用 ip+ua 的哈希，别把原始 IP 写进去。
  expect(String(visitorRow?.params[0])).toMatch(/^[0-9a-f]{40}$/);
  expect(String(visitorRow?.params[0])).not.toContain('203.0.113.20');
});

test('bots and unusable post ids never touch either counter', async () => {
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
