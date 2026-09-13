import { beforeAll, expect, mock, test } from 'bun:test';

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

const chromeUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

let bumpPostViewOnRead: typeof import('../src/backend/services/tracking')['bumpPostViewOnRead'];
let readVisitorFromRequest: typeof import('../src/backend/services/tracking')['readVisitorFromRequest'];

beforeAll(async () => {
  ({ bumpPostViewOnRead, readVisitorFromRequest } = await import('../src/backend/services/tracking'));
});

test('SSR post reads never write article counters', async () => {
  statements.length = 0;
  expect(await bumpPostViewOnRead(41, { ip: '203.0.113.9', ua: chromeUa })).toBe(false);
  expect(await bumpPostViewOnRead(41, { ip: '203.0.113.9', ua: 'Googlebot/2.1 (+http://www.google.com/bot.html)' })).toBe(false);
  expect(statements).toHaveLength(0);
});

test('/track records article views and daily post stats transactionally', async () => {
  const source = await Bun.file('app/start/src/backend/services/tracking.ts').text();
  const trackBlock = source.slice(source.indexOf('export async function trackPageView'));
  expect(trackBlock).toContain('trackedPostTarget(path)');
  expect(trackBlock).toContain('set view_count=coalesce(view_count,0)+1');
  expect(trackBlock).toContain('stats_visitor_post_dates');
  expect(trackBlock).toContain('stats_post_daily');
});

test('readVisitorFromRequest takes the proxied client ip, not the peer', () => {
  const request = new Request('https://example.com/archives/29', {
    headers: { 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '10.0.0.1', 'user-agent': chromeUa },
  });
  expect(readVisitorFromRequest(request)).toEqual({ ip: '198.51.100.7', ua: chromeUa });
});
