import { beforeAll, expect, mock, test } from 'bun:test';

// 全站浏览量（页脚那个数字）改由公开页 SSR 累加，口径跟文章阅读量一致：
// 打开算一次、刷新算一次，不去重也不限流，只挡爬虫。这里守住两条：真的
// 每次都写、以及 /track 那边不再重复累加同一个字段（否则一次访问算两次）。
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

let bumpSiteViewOnRender: typeof import('../src/backend/services/tracking')['bumpSiteViewOnRender'];

beforeAll(async () => {
  ({ bumpSiteViewOnRender } = await import('../src/backend/services/tracking'));
});

const siteViewWrites = () => statements.filter((s) => s.sql.includes('set total_views = total_views + 1'));

test('每次渲染都累加，刷新不去重', async () => {
  statements.length = 0;
  for (let i = 0; i < 5; i++) bumpSiteViewOnRender(chromeUa);
  // 写入是 fire-and-forget，等一轮微任务让它们排队进来
  await Promise.resolve();
  expect(siteViewWrites()).toHaveLength(5);
  expect(siteViewWrites()[0].sql).toContain('where id = 1');
});

test('爬虫不计入', async () => {
  statements.length = 0;
  bumpSiteViewOnRender('Googlebot/2.1 (+http://www.google.com/bot.html)');
  bumpSiteViewOnRender('Mozilla/5.0 (compatible; bingbot/2.0)');
  await Promise.resolve();
  expect(siteViewWrites()).toHaveLength(0);
});

test('不阻塞调用方 —— 返回值不是 Promise，SSR 不会等这次写库', () => {
  statements.length = 0;
  const result = bumpSiteViewOnRender(chromeUa) as unknown;
  expect(result).toBeUndefined();
});

test('/track 不再累加 total_views，避免与 SSR 双计', async () => {
  const source = await Bun.file('app/start/src/backend/services/tracking.ts').text();
  const trackBlock = source.slice(source.indexOf('export async function trackPageView'));
  // /track 里只应更新 total_uniques（唯一访客要靠浏览器 visitor_id 去重）
  expect(trackBlock).toContain('set total_uniques=total_uniques+$2');
  expect(trackBlock).not.toContain('total_views=total_views+1');
});
