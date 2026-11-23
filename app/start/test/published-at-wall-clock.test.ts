import { describe, expect, test } from 'bun:test';
import {
  instantPartsInTimeZone,
  naiveWallClockString,
  parseNaiveWallClockParts,
  publishedWallClockParts,
  publishedWallClockString,
} from '../src/backend/wall-clock';
import { postPath } from '../src/backend/services/posts';

const SITE_TZ = 'Asia/Shanghai';

/**
 * `ul_posts.published_at` 是 `timestamp without time zone`，存站点墙上时间。
 * postgres.js 用 `new Date(x)` 读它（V8 按进程本地时区解析），所以：
 *   - 服务器时区 UTC、站点时区 Asia/Shanghai → 读出来多 8 小时；
 *   - 服务器时区也是 Asia/Shanghai → 刚好对。
 * 线上服务器是 UTC，发布时间整体被推后 8 小时，后台编辑框预填偏移值、
 * 用户一保存就把偏移写回库。这些用例锁死「不换算」的语义。
 */

describe('naive published_at 保持站点墙上时间', () => {
  test('postgres.js 读出来的 Date 按本地分量还原，不做时区换算', () => {
    // new Date('无时区串') 与 postgres.js 的解析方式一致
    const parsed = new Date('2026-11-22 23:52:00');
    expect(naiveWallClockString(parsed)).toBe('2026-11-22T23:52:00');
    expect(publishedWallClockString(parsed, SITE_TZ)).toBe('2026-11-22T23:52:00');
    expect(publishedWallClockParts(parsed, SITE_TZ)).toEqual({
      year: 2026, month: 11, day: 22, hour: 23, minute: 52, second: 0,
    });
  });

  test('不带时区的字面量直接拆字面量', () => {
    expect(publishedWallClockString('2026-11-22 23:52:00', SITE_TZ)).toBe('2026-11-22T23:52:00');
    expect(publishedWallClockString('2026-11-22T23:52', SITE_TZ)).toBe('2026-11-22T23:52:00');
    expect(parseNaiveWallClockParts('2026-11-22 23:52:00')).toEqual({
      year: 2026, month: 11, day: 22, hour: 23, minute: 52, second: 0,
    });
  });

  test('epoch 与带时区的输入才按站点时区换算', () => {
    // 2026-11-22 23:52 +08 == 2026-11-22 15:52Z
    expect(publishedWallClockString('2026-11-22T15:52:00Z', SITE_TZ)).toBe('2026-11-22T23:52:00');
    expect(publishedWallClockString(1795333978, SITE_TZ)).toBe('2026-11-22T15:52:58');
  });

  test('绝对时刻换算与墙上时间还原互不干扰', () => {
    const instant = new Date('2026-11-22T15:52:00Z');
    expect(instantPartsInTimeZone(instant, SITE_TZ)).toEqual({
      year: 2026, month: 11, day: 22, hour: 23, minute: 52, second: 0,
    });
    // 同一个 instant 若按 naive 列读回来，本地分量仍是库里那串墙上时间
    expect(naiveWallClockString(new Date('2026-11-22 23:52:00'))).toBe('2026-11-22T23:52:00');
  });

  test('日期型固定链接按墙上时间取年月日', () => {
    const path = postPath(
      { id: 1, slug: 'hello', published_at: new Date('2026-11-22 23:52:00') },
      '/%year%/%month%/%day%/%postname%',
      SITE_TZ,
    );
    expect(path).toBe('/2026/11/22/hello');
  });
});
