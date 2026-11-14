/**
 * Robes 主题通用工具
 *
 * 原主题里这些逻辑散在 functions.php 里（getExcerpt / 摘要截断 / 时间格式化），
 * 这里按 Utterlog 的前端形态收敛成几个纯函数。
 */

/** 去掉 HTML 标签，压掉多余空白，用于摘要与 meta 描述。 */
export function plainText(html: string | undefined | null, limit = 0) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
  if (!limit || text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
}

/** 列表页第 N 页的地址。 */
export function pageHref(page: number) {
  return page <= 1 ? '/' : `/page/${page}`;
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** 把 Utterlog 的时间字段（ISO 字符串或秒级时间戳）转成 Date。 */
export function toDate(value: string | number | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    // created_at 是秒级时间戳；小于 1e11 视为秒。
    const ms = value < 1e11 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = String(value);
  // 纯数字字符串同样按时间戳处理。
  if (/^\d+$/.test(raw)) return toDate(Number(raw));
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | number | null | undefined, pattern = 'yyyy-MM-dd') {
  const date = toDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return pattern.replace('yyyy', String(year)).replace('MM', month).replace('dd', day);
}

/** 中文长日期：2026年11月14日 周五 */
export function formatLongDate(value: string | number | null | undefined) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 周${WEEK[date.getDay()]}`;
}

/** 中文短日期：11月14日 */
export function formatShortDate(value: string | number | null | undefined) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 归档行里的「日」：11 */
export function formatDay(value: string | number | null | undefined) {
  const date = toDate(value);
  if (!date) return '';
  return String(date.getDate());
}

/** 归档行里的星期：周三 */
export function formatWeek(value: string | number | null | undefined) {
  const date = toDate(value);
  if (!date) return '';
  return `周${WEEK[date.getDay()]}`;
}

/** 按中文阅读速度估算阅读时长（分钟）。 */
export function readMinutes(wordCount: number | undefined | null) {
  const words = Number(wordCount || 0);
  if (words <= 0) return 1;
  return Math.max(1, Math.ceil(words / 500));
}

/** WMO weather code → 中文描述 + 图标键。 */
export function weatherInfo(code: number | null | undefined, isDay = true) {
  const value = Number(code);
  if (!Number.isFinite(value)) return { desc: '天气待同步', icon: 'cloudy' as const };
  if (value === 0) return { desc: '晴朗', icon: 'sun' as const };
  if (value <= 2) return { desc: '多云', icon: 'suncloud' as const };
  if (value === 3) return { desc: '阴天', icon: 'cloudy' as const };
  if (value >= 45 && value <= 48) return { desc: '雾蒙蒙', icon: 'cloudy' as const };
  if (value >= 51 && value <= 57) return { desc: '毛毛雨', icon: 'rain' as const };
  if (value >= 61 && value <= 65) return { desc: '下雨', icon: 'rain' as const };
  if (value >= 66 && value <= 67) return { desc: '冻雨', icon: 'rain' as const };
  if (value >= 71 && value <= 77) return { desc: '下雪', icon: 'cloudy' as const };
  if (value >= 80 && value <= 82) return { desc: '阵雨', icon: 'rain' as const };
  if (value >= 85 && value <= 86) return { desc: '阵雪', icon: 'cloudy' as const };
  if (value >= 95) return { desc: '雷阵雨', icon: 'rain' as const };
  return { desc: isDay ? '天气不错' : '夜间多云', icon: 'cloudy' as const };
}

/** 公告文本解析：支持「2026-11-05｜公告内容」写法。 */
export function parseNoticeBoard(raw: string) {
  return String(raw || '')
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2})\s*[|｜]\s*(.+)$/);
      if (match) return { date: match[1], text: match[2].trim() };
      return { date: '', text: line };
    });
}
