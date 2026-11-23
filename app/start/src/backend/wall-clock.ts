/**
 * 站点墙上时间（naive timestamp）工具。
 *
 * `ul_posts.published_at` 是 PostgreSQL 的 `timestamp without time zone`，
 * 存的是站点时区下的「墙上时间」（例如 2026-11-22 23:52），本身不带时区信息。
 *
 * postgres.js 读这种列时走内置的 date 类型（types.date 的 from 列表包含 1114），
 * 解析方式是 `new Date(x)` —— V8 会把不带时区的日期串按**进程本地时区**当成一个
 * 时刻。于是同一个值在不同部署下表现不一致：
 *   - 服务器时区 UTC、站点时区 Asia/Shanghai：读出来比库里多 8 小时；
 *   - 服务器时区也是 Asia/Shanghai：刚好对得上。
 * 线上服务器跑在 UTC，所以文章发布时间整体被推后 8 小时；后台编辑框预填的又是
 * 这个偏移后的值，用户一保存就把偏移写回库（published_at 从此固定差 8 小时）。
 *
 * 这里统一按「库里存的就是站点墙上时间」处理：
 *   - Date 一律用本地分量还原（postgres.js 就是按本地时区解析的，能原样还原）；
 *   - 不带时区的字面量直接拆字面量；
 *   - epoch / 带时区字面量才当作绝对时刻，按站点时区换算。
 * 任何情况下都不做「本地时区 → 站点时区」的二次换算。
 */

export interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function isValidTimeZone(timeZone: string) {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** postgres.js 解析出来的 Date → 库里存的墙上时间（"2026-11-22T23:52:00"） */
export function naiveWallClockString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 不带时区的字面量 → 分量 */
export function parseNaiveWallClockParts(text: string): WallClockParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/.exec(String(text || '').trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
  };
}

/** 绝对时刻 → 站点时区下的分量 */
export function instantPartsInTimeZone(date: Date, timeZone: string): WallClockParts {
  if (!isValidTimeZone(timeZone)) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
}

function isEpochLike(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value);
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text);
}

function epochToDate(value: unknown): Date | null {
  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) return null;
  const date = new Date(Math.abs(numeric) > 1e9 && Math.abs(numeric) < 1e10 ? numeric * 1000 : numeric);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 发布时间 → 站点墙上时间分量。
 *
 * - Date：postgres.js 读 naive 列的结果，本地分量即库里存的墙上时间；
 * - 不带时区的字面量：直接拆字面量；
 * - epoch 秒 / 带时区字面量：绝对时刻，按站点时区换算。
 */
export function publishedWallClockParts(value: unknown, timeZone: string): WallClockParts | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds(),
    };
  }
  if (isEpochLike(value)) {
    const date = epochToDate(value);
    return date ? instantPartsInTimeZone(date, timeZone) : null;
  }
  const text = String(value).trim();
  const naive = parseNaiveWallClockParts(text);
  if (naive) return naive;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return instantPartsInTimeZone(date, timeZone);
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : instantPartsInTimeZone(fallback, timeZone);
}

/** 发布时间 → 站点墙上时间字符串（"2026-11-22T23:52:00"） */
export function publishedWallClockString(value: unknown, timeZone: string): string | null {
  const parts = publishedWallClockParts(value, timeZone);
  if (!parts) return null;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}
