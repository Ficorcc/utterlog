import { beforeAll, describe, expect, mock, test } from 'bun:test';

/**
 * 订阅时间线的时间窗口。
 *
 * 页面上原来显示「1059 篇文章」，实际近一个月只有 109 篇更新 —— 因为计数是
 * feed_items 的全表 count，而各站 RSS 里挂着的陈年旧文（最早到 2001 年）每次
 * 刷新都会被抓进来。
 *
 * 两件事必须同时成立：
 *   1. 按 pub_date（发布时间）过滤，不能按 created_at（入库时间）—— 后者对
 *      每一条旧文都是「刚刚」，等于没有过滤。
 *   2. 计数和列表用同一个窗口，否则页面说 N 篇却只翻得出更少。
 */

const NOW = 1_800_000_000;
const DAY = 24 * 3600;

// 记下每条查询实际带上的参数，用来断言过滤条件确实生效了
const queries: { sql: string; params: unknown[] }[] = [];

mock.module('../src/backend/db/helpers', () => ({
  one: async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    return { count: '109', last_fetched_at: '0' };
  },
  many: async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    return [];
  },
  exec: async () => ({ count: 0 }),
  nowUnix: () => NOW,
  intParam: (value: string | undefined, fallback = 0) => Number(value ?? fallback) || fallback,
  pageParams: () => ({ page: 1, perPage: 20 }),
}));

mock.module('../src/backend/db/options', () => ({
  optionValue: async (_name: string, fallback = '') => fallback,
  saveOption: async () => {},
  readOptionMap: async () => ({}),
}));

let mod: typeof import('../src/backend/routes/compat');

beforeAll(async () => {
  mod = await import('../src/backend/routes/compat');
});

/** 取所有查了 feed_items 的语句。 */
function feedQueries() {
  return queries.filter((item) => item.sql.includes('feed_items'));
}

describe('订阅时间线只看近 30 天', () => {
  test('列表和计数都按 pub_date 过滤，且用的是同一个 30 天边界', async () => {
    queries.length = 0;
    await mod.socialFeedTimeline(1, new URLSearchParams());
    const hits = feedQueries();
    expect(hits.length).toBe(2);   // 一条计数 + 一条列表
    for (const { sql, params } of hits) {
      expect(sql).toContain('pub_date >=');
      // 不能退回按入库时间过滤 —— 那样每条旧文都算「最近」
      expect(sql).not.toMatch(/created_at\s*>=/);
      expect(params).toContain(NOW - 30 * DAY);
    }
  });

  test('翻页不会把窗口丢掉', async () => {
    queries.length = 0;
    await mod.socialFeedTimeline(1, new URLSearchParams('page=3&per_page=20'));
    for (const { sql, params } of feedQueries()) {
      expect(sql).toContain('pub_date >=');
      expect(params).toContain(NOW - 30 * DAY);
    }
  });

  test('统计里的总数跟时间线同窗口，7 天数也按发布时间算', async () => {
    queries.length = 0;
    await mod.socialFeedStats(1);
    const hits = feedQueries();
    expect(hits.length).toBe(2);
    const bounds = hits.map(({ sql, params }) => {
      expect(sql).toContain('pub_date >=');
      expect(sql).not.toMatch(/created_at\s*>=/);
      return params[1];
    });
    // 一个 30 天窗口（对齐时间线），一个 7 天窗口
    expect(new Set(bounds)).toEqual(new Set([NOW - 30 * DAY, NOW - 7 * DAY]));
  });

  test('统计的总数口径必须跟时间线的总数口径一致', async () => {
    queries.length = 0;
    await mod.socialFeedTimeline(1, new URLSearchParams());
    const timelineBound = feedQueries()[0].params[1];
    queries.length = 0;
    await mod.socialFeedStats(1);
    // stats 的第二条查询是 count_total
    const statsTotalBound = feedQueries()[1].params[1];
    expect(statsTotalBound).toBe(timelineBound);
  });
});
