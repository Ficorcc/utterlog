import { datePartsInTimeZone, formatDateInTimeZone, formatDateTimeInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

/** 上游文章页用的中文月份 / 农历式日期标签 */
export const MONTH_LABELS = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export const DAY_LABELS: Record<number, string> = {
  1: '初一', 2: '初二', 3: '初三', 4: '初四', 5: '初五', 6: '初六', 7: '初七', 8: '初八', 9: '初九',
  10: '初十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五', 16: '十六', 17: '十七',
  18: '十八', 19: '十九', 20: '廿', 21: '廿一', 22: '廿二', 23: '廿三', 24: '廿四', 25: '廿五',
  26: '廿六', 27: '廿七', 28: '廿八', 29: '廿九', 30: '三十', 31: '卅一',
};

export function postDateLabel(post: any, timeZone: string, withTime = false) {
  if (withTime) return postDateTimeLabel(post, timeZone);
  return formatDateInTimeZone(
    postDateInput(post),
    'zh-CN',
    { year: 'numeric', month: '2-digit', day: '2-digit' },
    timeZone,
  );
}

/** 上游时间标签统一是「YYYY-MM-DD HH:mm」 */
export function postDateTimeLabel(post: any, timeZone: string) {
  const text = formatDateTimeInTimeZone(
    postDateInput(post),
    'zh-CN',
    { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false },
    timeZone,
  );
  return text.replace(/\//g, '-');
}

export function postMonthDay(post: any, timeZone: string) {
  const { month, day } = datePartsInTimeZone(postDateInput(post), timeZone);
  if (!month) return { month: '', day: '' };
  return {
    month: MONTH_LABELS[month] ?? `${month}月`,
    day: DAY_LABELS[day] ?? `${day}日`,
  };
}

export function stripHtml(value: string) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerptOf(post: any, length = 180) {
  const raw = post?.excerpt || post?.summary || post?.content || '';
  const text = stripHtml(String(raw));
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function coverOf(post: any): string {
  return String(post?.cover_url || post?.cover || '');
}

export interface PostCategory {
  name: string;
  slug: string;
  icon?: string;
}

export function firstCategory(post: any): PostCategory | null {
  const list = Array.isArray(post?.categories) ? post.categories : [];
  const first = list[0];
  if (!first) return null;
  return {
    name: String(first.name || ''),
    slug: String(first.slug || ''),
    icon: typeof first.icon === 'string' && first.icon ? first.icon : 'fa-regular fa-folder',
  };
}

export function categoryHref(category: PostCategory | null) {
  if (!category || !category.slug) return '';
  return `/categories/${category.slug}`;
}

/** 上游的分类色板：0-5 循环 */
export function categoryColor(index: number) {
  return ((index % 6) + 6) % 6;
}
