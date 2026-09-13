import { beforeAll, expect, mock, test } from 'bun:test';

const statements: { sql: string; params: unknown[] }[] = [];

mock.module('../src/backend/db/helpers', () => ({
  nowUnix: () => Math.floor(Date.now() / 1000),
  one: async (sql: string, params: unknown[] = []) => {
    statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    if (sql.includes('sum(visits)')) return { total: '17741' };
    return null;
  },
  many: async () => [],
  exec: async (sql: string, params: unknown[] = []) => {
    statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    return { count: 1 };
  },
}));

const chromeUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

let bumpSiteViewOnRender: typeof import('../src/backend/services/tracking')['bumpSiteViewOnRender'];
let siteTotalViews: typeof import('../src/backend/services/analytics')['siteTotalViews'];

beforeAll(async () => {
  ({ bumpSiteViewOnRender } = await import('../src/backend/services/tracking'));
  ({ siteTotalViews } = await import('../src/backend/services/analytics'));
});

test('SSR renders never write site view counters', async () => {
  statements.length = 0;
  for (let i = 0; i < 5; i++) bumpSiteViewOnRender(chromeUa);
  await Promise.resolve();
  expect(statements).toHaveLength(0);
});

test('site total reads the daily _total rollup', async () => {
  statements.length = 0;
  expect(await siteTotalViews()).toBe(17741);
  expect(statements[0].sql).toContain('sum(visits)');
  expect(statements[0].sql).toContain("dimension = '_total'");
  expect(statements[0].sql).not.toContain('stats_global');
});

test('/track is the only path that increments total_views', async () => {
  const source = await Bun.file('app/start/src/backend/services/tracking.ts').text();
  const trackBlock = source.slice(source.indexOf('export async function trackPageView'));
  expect(trackBlock).toContain('total_views=total_views+1');
  expect(trackBlock).toContain('stats_daily');
  expect(trackBlock).toContain("'_total'");
});
