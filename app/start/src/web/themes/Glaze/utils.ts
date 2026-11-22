import { datePartsInTimeZone, formatDateInTimeZone, formatDateTimeInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

/**
 * Glaze 主题的公共工具。
 *
 * 时间一律走站点时区（useThemeContext().timeZone），日期展示规则与上游一致：
 * 30 天内显示相对时间，超过 30 天显示「YYYY-MM-DD」。
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 上游把 30 天作为「相对时间」的边界 */
const RELATIVE_LIMIT = 30 * DAY;

/**
 * 时间输入归一化。
 *
 * 站点的数据里三种时间格式混用：published_at 是 timestamp 字符串，
 * created_at 是 integer（Unix 秒），评论的 created_at 也是 Unix 秒。
 * 这里统一成「毫秒时间戳或可被 Date 解析的字符串」，避免把秒当成毫秒。
 */
export function toDateInput(value: any): string | number {
  if (value == null || value === '') return 0;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    return Math.abs(value) < 1e12 ? value * 1000 : value;
  }
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    const num = Number(text);
    return num < 1e12 ? num * 1000 : num;
  }
  return text;
}

export function unixSeconds(value: any): number {
  const input = toDateInput(value);
  if (!input) return 0;
  const time = new Date(input).getTime();
  return Number.isNaN(time) ? 0 : Math.floor(time / 1000);
}

export function relativeTime(value: any): string {
  const seconds = unixSeconds(value);
  if (!seconds) return '';
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 0) return '';
  if (diff < MINUTE) return '刚刚';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < RELATIVE_LIMIT) return `${Math.floor(diff / DAY)} 天前`;
  return dateLabel(value);
}

/** 「YYYY-MM-DD」 */
export function dateLabel(value: any, timeZone = 'UTC'): string {
  const input = toDateInput(value);
  if (!input) return '';
  return formatDateInTimeZone(input, 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }, timeZone).replace(/\//g, '-');
}

/** 「YYYY-MM-DD HH:mm」 */
export function dateTimeLabel(value: any, timeZone = 'UTC'): string {
  const input = toDateInput(value);
  if (!input) return '';
  return formatDateTimeInTimeZone(
    input,
    'zh-CN',
    { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false },
    timeZone,
  ).replace(/\//g, '-');
}

/** 列表卡片用的时间标签：30 天内相对时间，更早是日期 */
export function cardDateLabel(post: any, timeZone = 'UTC'): string {
  const seconds = unixSeconds(post?.published_at || post?.created_at);
  if (!seconds) return '';
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff >= 0 && diff < RELATIVE_LIMIT) return relativeTime(post?.published_at || post?.created_at);
  return dateLabel(post?.published_at || post?.created_at, timeZone);
}

/** 侧轨用的短日期「M/D」 */
export function shortDateLabel(value: any, timeZone = 'UTC'): string {
  const input = postDateInput({ published_at: value, created_at: value });
  const { month, day } = datePartsInTimeZone(input, timeZone);
  if (!month || !day) return '';
  return `${month}/${day}`;
}

export function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerptOf(post: any, length = 180): string {
  const raw = post?.excerpt || post?.summary || post?.content || '';
  const text = stripHtml(String(raw));
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function coverOf(post: any): string {
  return String(post?.cover_url || post?.cover || '');
}

export interface GlazeCategory {
  id?: number;
  name: string;
  slug: string;
  icon?: string;
  count?: number;
}

export interface GlazeTag {
  id?: number;
  name: string;
  slug: string;
  count?: number;
}

export function categoriesOf(post: any): GlazeCategory[] {
  const list = Array.isArray(post?.categories) ? post.categories : [];
  return list
    .map((item: any) => ({
      id: item?.id,
      name: String(item?.name || ''),
      slug: String(item?.slug || ''),
      icon: typeof item?.icon === 'string' && item.icon ? item.icon : '',
      count: item?.count,
    }))
    .filter((item: GlazeCategory) => item.name);
}

export function tagsOf(post: any): GlazeTag[] {
  const list = Array.isArray(post?.tags) ? post.tags : [];
  return list
    .map((item: any) => ({
      id: item?.id,
      name: String(item?.name || ''),
      slug: String(item?.slug || ''),
      count: item?.count,
    }))
    .filter((item: GlazeTag) => item.name);
}

export function categoryHref(category: GlazeCategory | null | undefined): string {
  if (!category?.slug) return '/categories';
  return `/categories/${category.slug}`;
}

export function tagHref(tag: GlazeTag | null | undefined): string {
  if (!tag?.slug) return '/tags';
  return `/tags/${tag.slug}`;
}

export function commentCountOf(post: any): number {
  return Number(post?.comment_count || 0);
}

export function viewCountOf(post: any): number {
  return Number(post?.view_count || post?.visit_count || 0);
}

/** 评论头像组最多展示的人数 */
export const COMMENT_AVATAR_LIMIT = 5;

export function pluralCn(count: number, unit: string): string {
  return `${count} ${unit}`;
}

/** 站点根元素上的 glaze 外观属性（与上游 data-glaze-* 一一对应） */
export const GLAZE_PALETTES = [
  { key: 'green', label: '青绿' },
  { key: 'mint', label: '薄荷' },
  { key: 'teal', label: '青碧' },
  { key: 'blue', label: '靛蓝' },
  { key: 'indigo', label: '蓝紫' },
  { key: 'violet', label: '紫罗兰' },
  { key: 'pink', label: '桃粉' },
  { key: 'coral', label: '珊瑚' },
  { key: 'amber', label: '琥珀' },
  { key: 'slate', label: '石板' },
  { key: 'cinnabar', label: '朱砂' },
  { key: 'bamboo', label: '竹青' },
  { key: 'ochre', label: '赭石' },
  { key: 'lotus', label: '莲华' },
] as const;

export type GlazePalette = (typeof GLAZE_PALETTES)[number]['key'];

export const GLAZE_SCHEMES = ['light', 'dark'] as const;
export const GLAZE_BACKGROUNDS = [
  { key: 'none', label: '纯色' },
  { key: 'blue-preview', label: '蓝色预览' },
  { key: 'ripples', label: '水波光斑' },
] as const;
export const GLAZE_CORNERS = [
  { key: 'squircle', label: '圆角方形' },
  { key: 'square', label: '直角' },
  { key: 'round', label: '正圆' },
] as const;

export const GLAZE_PALETTE_KEYS = GLAZE_PALETTES.map((item) => item.key);
export const GLAZE_BACKGROUND_KEYS = GLAZE_BACKGROUNDS.map((item) => item.key);
export const GLAZE_CORNER_KEYS = GLAZE_CORNERS.map((item) => item.key);

export function isGlazePalette(value: string): value is GlazePalette {
  return (GLAZE_PALETTE_KEYS as string[]).includes(value);
}

export function isGlazeBackground(value: string): boolean {
  return (GLAZE_BACKGROUND_KEYS as string[]).includes(value);
}

export function isGlazeCorners(value: string): boolean {
  return (GLAZE_CORNER_KEYS as string[]).includes(value);
}

/** 内容宽度：上游用 4 位零填充字符串（前两位百位、后两位余量） */
export function normalizeContentWidth(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  // 上游允许范围 360–1600，默认 600
  const num = digits ? Math.min(1600, Math.max(360, Number(digits))) : 600;
  return String(num).padStart(4, '0');
}

/** option 键 → 根元素属性 */
export const GLAZE_OPTION_KEYS = {
  palette: 'glaze_palette',
  scheme: 'glaze_scheme',
  background: 'glaze_background',
  corners: 'glaze_corners',
  contentWidth: 'glaze_content_width',
} as const;

export interface GlazeAppearance {
  palette: string;
  scheme: string;
  background: string;
  corners: string;
  contentWidth: string;
}

export function appearanceFromOptions(options: Record<string, string | undefined> | null | undefined): GlazeAppearance {
  const opts = options || {};
  const palette = String(opts[GLAZE_OPTION_KEYS.palette] || '').trim();
  const scheme = String(opts[GLAZE_OPTION_KEYS.scheme] || '').trim();
  const background = String(opts[GLAZE_OPTION_KEYS.background] || '').trim();
  const corners = String(opts[GLAZE_OPTION_KEYS.corners] || '').trim();
  const contentWidth = String(opts[GLAZE_OPTION_KEYS.contentWidth] || '').trim();
  return {
    palette: isGlazePalette(palette) ? palette : 'green',
    scheme: scheme === 'dark' || scheme === 'light' ? scheme : 'light',
    // 上游默认是「蓝色预览」光斑背景
    background: isGlazeBackground(background) ? background : 'blue-preview',
    corners: isGlazeCorners(corners) ? corners : 'squircle',
    contentWidth: normalizeContentWidth(contentWidth),
  };
}

/** 站点图标/头像等图片地址兜底 */
export function externalHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}
