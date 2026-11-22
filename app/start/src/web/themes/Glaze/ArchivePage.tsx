import { useMemo } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import {
  categoryHref,
  commentCountOf,
  dateLabel,
  tagHref,
  viewCountOf,
  type GlazeCategory,
  type GlazeTag,
} from './utils';

/**
 * 归档页：对照上游 pages/archive.php 的结构。
 *
 *   div.archive-view[data-glaze-archive]
 *     header.page-heading.glaze-panel      标题 + 站点统计
 *     section.archive-activity              热力日历
 *     section.archive-index                  按月分组的文章索引
 *     div.archive-taxonomies                 分类 / 标签折叠面板
 */

/** 文章列表项（列表接口不含正文） */
export interface ArchivePost {
  id: number;
  title?: string;
  slug?: string;
  excerpt?: string;
  cover_url?: string;
  view_count?: number;
  comment_count?: number;
  published_at?: string | number | null;
  created_at?: string | number;
}

/** 归档统计（对应 ctx.archiveStats） */
export interface ArchiveStats {
  post_count?: number;
  comment_count?: number;
  word_count?: number;
  days?: number;
  total_views?: number;
  heatmap?: { date: string; count: number }[];
}

export interface ArchivePageProps {
  posts?: ArchivePost[];
  categories?: GlazeCategory[];
  tags?: GlazeTag[];
  stats?: ArchiveStats;
  timeZone?: string;
}

const DAY_MS = 86400000;
/** 上游日历只标周一 / 三 / 五 / 日 */
const WEEKDAY_LABELS = ['一', '三', '五', '日'];

interface CalendarDay {
  date: string;
  count: number;
  /** '0'–'4' | 'outside' | 'future' */
  level: string;
}

interface CalendarWeek {
  /** 该周首次出现的月份名，没有则为空 */
  label: string;
  days: CalendarDay[];
}

interface MonthGroup {
  key: string;
  label: string;
  total: number;
  days: { date: string; posts: ArchivePost[] }[];
}

function dateKeyOf(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

/**
 * 每年单独按「每日文章数」的分位切 0–4 级：
 * 0 = 当天没有文章，1–4 = 当年有文章日期里的四分位。
 */
function buildLevels(counts: Map<string, number>): Map<string, number> {
  const byYear = new Map<number, number[]>();
  for (const [date, count] of counts) {
    if (count <= 0) continue;
    const year = Number(date.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const list = byYear.get(year);
    if (list) list.push(count);
    else byYear.set(year, [count]);
  }

  const levels = new Map<string, number>();
  for (const [year, list] of byYear) {
    list.sort((a, b) => a - b);
    const q1 = quantile(list, 0.25);
    const q2 = quantile(list, 0.5);
    const q3 = quantile(list, 0.75);
    for (const [date, count] of counts) {
      if (count <= 0) continue;
      if (Number(date.slice(0, 4)) !== year) continue;
      levels.set(date, count <= q1 ? 1 : count <= q2 ? 2 : count <= q3 ? 3 : 4);
    }
  }
  return levels;
}

/** 把某一年的日历拆成「周」：每周从周日开始，首尾补齐到整周。 */
function buildYearWeeks(year: number, counts: Map<string, number>, levels: Map<string, number>, today: string): CalendarWeek[] {
  const first = new Date(Date.UTC(year, 0, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * DAY_MS);
  const last = new Date(Date.UTC(year, 11, 31));
  const end = new Date(last.getTime() + ((6 - last.getUTCDay() + 7) % 7) * DAY_MS);

  const weeks: CalendarWeek[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += 7 * DAY_MS) {
    const days: CalendarDay[] = [];
    let label = '';
    for (let offset = 0; offset < 7; offset += 1) {
      const current = new Date(time + offset * DAY_MS);
      const date = dateKeyOf(current);
      const count = counts.get(date) || 0;
      let level: string;
      if (current.getUTCFullYear() !== year) level = 'outside';
      else if (date > today) level = 'future';
      else level = String(levels.get(date) || 0);
      days.push({ date, count, level });
      if (!label && current.getUTCFullYear() === year && current.getUTCDate() === 1) {
        label = `${current.getUTCMonth() + 1}月`;
      }
    }
    weeks.push({ label, days });
  }
  return weeks;
}

function groupByMonth(posts: ArchivePost[], timeZone: string): MonthGroup[] {
  const months = new Map<string, { label: string; days: Map<string, ArchivePost[]> }>();

  const sorted = [...posts].sort((a, b) => {
    const left = dateLabel(a.published_at || a.created_at, timeZone);
    const right = dateLabel(b.published_at || b.created_at, timeZone);
    if (left === right) return Number(b.id || 0) - Number(a.id || 0);
    return right < left ? -1 : 1;
  });

  for (const post of sorted) {
    const date = dateLabel(post.published_at || post.created_at, timeZone);
    if (!date) continue;
    const key = date.slice(0, 7);
    const year = date.slice(0, 4);
    const month = Number(date.slice(5, 7));
    let group = months.get(key);
    if (!group) {
      group = { label: `${year} 年 ${month} 月`, days: new Map() };
      months.set(key, group);
    }
    const list = group.days.get(date);
    if (list) list.push(post);
    else group.days.set(date, [post]);
  }

  return Array.from(months.entries()).map(([key, group]) => {
    const days = Array.from(group.days.entries()).map(([date, list]) => ({ date, posts: list }));
    const total = days.reduce((sum, item) => sum + item.posts.length, 0);
    return { key, label: group.label, total, days };
  });
}

export default function ArchivePage({
  posts = [],
  categories = [],
  tags = [],
  stats = {},
  timeZone = 'UTC',
}: ArchivePageProps) {
  const list = Array.isArray(posts) ? posts : [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const tagList = Array.isArray(tags) ? tags : [];

  const heatmap = Array.isArray(stats?.heatmap) ? stats.heatmap : [];
  const today = dateLabel(new Date(), timeZone);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of heatmap) {
      const date = String(item?.date || '');
      if (!date) continue;
      map.set(date, Number(item?.count || 0));
    }
    return map;
  }, [heatmap]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const date of counts.keys()) {
      const year = Number(date.slice(0, 4));
      if (Number.isFinite(year) && year > 0) set.add(year);
    }
    if (!set.size) {
      const current = Number(today.slice(0, 4));
      if (Number.isFinite(current) && current > 0) set.add(current);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [counts, today]);

  const weeks = useMemo(() => {
    const levels = buildLevels(counts);
    return years.flatMap((year) => buildYearWeeks(year, counts, levels, today));
  }, [counts, years, today]);

  const months = useMemo(() => groupByMonth(list, timeZone), [list, timeZone]);

  const headline = [
    { value: Number(stats?.post_count ?? list.length), label: '篇文章' },
    { value: categoryList.length, label: '个分类' },
    { value: Number(stats?.word_count || 0), label: '字' },
    { value: Number(stats?.total_views || 0), label: '次浏览' },
    { value: Number(stats?.days || 0), label: '天写作' },
  ];

  return (
    <div className="archive-view" data-glaze-archive="">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle">
            <span className="glaze-icon" data-glaze-icon="archives" aria-hidden="true" />
          </span>
          <span>归档</span>
        </h1>
        <ul className="archive-stats" role="list">
          {headline.map((item) => (
            <li key={item.label}>
              <strong>{item.value.toLocaleString('zh-CN')}</strong> {item.label}
            </li>
          ))}
        </ul>
      </header>

      <section className="archive-activity">
        <div className="archive-calendar-frame">
          <div className="archive-calendar-scroll" role="region" tabIndex={0} aria-label="写作热力日历">
            <div className="archive-calendar">
              <div className="archive-calendar-weekdays" aria-hidden="true">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="archive-calendar-weeks">
                {weeks.map((week, index) => (
                  <div className="archive-calendar-week" key={`week-${index}`}>
                    {week.label ? (
                      <div className="archive-calendar-month" aria-hidden="true">
                        <span>{week.label}</span>
                      </div>
                    ) : null}
                    {week.days.map((day) => {
                      const title = `${day.date} · ${day.count} 篇`;
                      if (day.count > 0) {
                        return (
                          <Link
                            key={day.date}
                            href={`#archive-day-${day.date}`}
                            className="archive-calendar-day"
                            data-level={day.level}
                            title={title}
                          >
                            <span className="screen-reader-text">{title}</span>
                          </Link>
                        );
                      }
                      return (
                        <span key={day.date} className="archive-calendar-day" data-level={day.level} title={title} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="archive-calendar-legend" aria-hidden="true">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className="archive-calendar-day" data-level={level} />
            ))}
            <span>多</span>
          </div>
        </div>
      </section>

      <section className="archive-index">
        <div className="archive-section-heading">
          <h2 id="archive-index-title">文章索引</h2>
        </div>

        {months.length === 0 ? <p className="archive-empty">还没有文章</p> : null}

        {months.map((month) => (
          <div className="archive-month" key={month.key}>
            <div className="archive-section-heading">
              <h3>{month.label}</h3>
              <span>{month.total} 篇</span>
            </div>
            <ul className="archive-posts" role="list">
              {month.days.map((day) => (
                <li key={day.date} id={`archive-day-${day.date}`} tabIndex={-1}>
                  {day.posts.map((post) => (
                    <PostLink key={post.id} post={post} className="archive-post squircle">
                      <time dateTime={day.date}>{day.date.slice(5).replace('-', '/')}</time>
                      <span className="archive-post-title">
                        <span className="glaze-icon" data-glaze-icon="archives" aria-hidden="true" />
                        <span>{post.title || ''}</span>
                      </span>
                      <span className="archive-post-metrics">
                        <span>
                          <i className="fa-regular fa-comment" aria-hidden="true" /> {commentCountOf(post)}
                        </span>
                        <span>
                          <i className="fa-regular fa-eye" aria-hidden="true" /> {viewCountOf(post)}
                        </span>
                      </span>
                    </PostLink>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="archive-taxonomies">
        <details className="archive-taxonomy squircle">
          <summary>
            <span className="glaze-icon" data-glaze-icon="categories" aria-hidden="true" />
            分类
          </summary>
          <ul role="list">
            {categoryList.map((category) => (
              <li key={category.id ?? category.slug}>
                <Link href={categoryHref(category)} className="squircle">
                  {category.name}
                  <sup>{Number(category.count || 0)}</sup>
                </Link>
              </li>
            ))}
          </ul>
        </details>

        <details className="archive-taxonomy squircle">
          <summary>
            <span className="glaze-icon" data-glaze-icon="tags" aria-hidden="true" />
            标签
          </summary>
          <ul role="list">
            {tagList.map((tag) => (
              <li key={tag.id ?? tag.slug}>
                <Link href={tagHref(tag)} className="squircle">
                  {tag.name}
                  <sup>{Number(tag.count || 0)}</sup>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
