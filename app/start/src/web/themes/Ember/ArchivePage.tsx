import type { CSSProperties } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { datePartsInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import { categoryColor, firstCategory } from './utils';

/**
 * 归档页：对照上游 pages/archive.php 的结构。
 *
 *   .archive-page > .archive-shell
 *     .archive-hero            标题 + 站点统计
 *     .archive-heat-panel      近一年更新热力图
 *     .archive-categories      分类卡片网格
 *     .archive-years           按年 / 月分组的文章列表
 */

const HEAT_WEEKS = 53;
const MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface HeatCell {
  date: string;
  count: number;
  level: number;
  muted: boolean;
}

interface HeatMonth {
  week: number;
  label: string;
}

interface MonthGroup {
  month: number;
  label: string;
  posts: any[];
}

interface YearGroup {
  year: number;
  months: MonthGroup[];
}

/** 热力等级：0 空、1 一篇、2 三篇以内、3 六篇以内、4 更多 */
function heatLevel(count: number) {
  if (count <= 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * 把「近一年每日篇数」摊成上游那种 7 行 × N 列的日历：
 * 第一格落在周日，最后一格是今天所在周的周日。
 */
function buildHeatmap(heatmap: any[], timeZone: string) {
  const counts = new Map<string, number>();
  for (const item of Array.isArray(heatmap) ? heatmap : []) {
    const date = String(item?.date || '');
    if (!date) continue;
    counts.set(date, Number(item?.count || 0));
  }

  const today = datePartsInTimeZone(new Date(), timeZone);
  const anchor = new Date(Date.UTC(today.year || 1970, (today.month || 1) - 1, today.day || 1));
  const lastSunday = new Date(anchor.getTime() - anchor.getUTCDay() * 86400000);
  const start = new Date(lastSunday.getTime() - (HEAT_WEEKS - 1) * 7 * 86400000);

  const days: HeatCell[] = [];
  const months: HeatMonth[] = [];
  let lastMonth = -1;

  for (let index = 0; index < HEAT_WEEKS * 7; index += 1) {
    const current = new Date(start.getTime() + index * 86400000);
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth() + 1;
    const day = current.getUTCDate();
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = counts.get(date) || 0;
    days.push({ date, count, level: heatLevel(count), muted: count === 0 });
    if (month !== lastMonth) {
      months.push({ week: Math.floor(index / 7) + 1, label: MONTH_LABELS[month] || `${month}月` });
      lastMonth = month;
    }
  }

  return { weeks: HEAT_WEEKS, days, months };
}

function groupByYearMonth(posts: any[], timeZone: string): YearGroup[] {
  const years = new Map<number, Map<number, any[]>>();
  for (const post of posts) {
    const { year, month } = datePartsInTimeZone(postDateInput(post), timeZone);
    if (!year || !month) continue;
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(post);
  }

  return Array.from(years.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, list]) => ({ month, label: MONTH_LABELS[month] || `${month}月`, posts: list })),
    }));
}

/** 每个分类取一篇最新文章，用于分类卡片底部 */
function latestPerCategory(posts: any[], categories: any[]) {
  const latest = new Map<number, any>();
  for (const category of categories) {
    const found = posts.find((post: any) =>
      Array.isArray(post?.categories) && post.categories.some((item: any) => Number(item?.id) === Number(category?.id)),
    );
    if (found) latest.set(Number(category.id), found);
  }
  return latest;
}

export default function ArchivePage({
  posts = [],
  categories = [],
  tags = [],
  stats = {},
  timeZone = 'UTC',
}: {
  posts?: any[];
  categories?: any[];
  tags?: any[];
  stats?: any;
  timeZone?: string;
}) {
  const list = Array.isArray(posts) ? posts : [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const tagList = Array.isArray(tags) ? tags : [];
  const heat = buildHeatmap(stats?.heatmap || [], timeZone);
  const years = groupByYearMonth(list, timeZone);
  const latest = latestPerCategory(list, categoryList);
  const weeksStyle = { '--weeks': heat.weeks } as unknown as CSSProperties;

  const headline = [
    { value: Number(stats?.post_count || list.length), label: '篇文章' },
    { value: Number(stats?.days || 0), label: '天' },
    { value: Number(stats?.word_count || 0), label: '字' },
    { value: Number(stats?.comment_count || 0), label: '条评论' },
  ];

  return (
    <section className="archive-page">
      <div className="archive-shell">
        <header className="archive-hero">
          <div className="archive-title">
            <i className="fa-solid fa-box-archive" aria-hidden="true" />
            <h1>归档</h1>
          </div>
          <div className="archive-stats" aria-label="站点归档统计">
            {headline.map((item) => (
              <span key={item.label}>
                <strong>{item.value.toLocaleString()}</strong> {item.label}
              </span>
            ))}
          </div>
        </header>

        <section className="archive-heat-panel">
          <div className="archive-section-head">
            <h2>近一年更新热力图</h2>
          </div>
          <div className="archive-heat-scroll site-heatmap-scroll">
            <div className="archive-heat-inner site-heatmap-inner" style={weeksStyle}>
              <div className="archive-heat-months site-heatmap-months">
                {heat.months.map((month) => (
                  <span key={`${month.week}-${month.label}`} style={{ gridColumn: month.week }}>
                    {month.label}
                  </span>
                ))}
              </div>
              <div className="archive-heat-cells site-heatmap-cells" aria-label="近一年每日写作热力图">
                {heat.days.map((cell) => (
                  <span
                    key={cell.date}
                    className={`archive-heat-cell site-heatmap-cell level-${cell.level}${cell.muted ? ' is-muted' : ''}`}
                    title={`${cell.date}：${cell.count > 0 ? `${cell.count} 篇文章` : '没有文章'}`}
                  />
                ))}
              </div>
              <div className="archive-heat-legend site-heatmap-legend">
                <span>少</span>
                <i className="level-0" />
                <i className="level-1" />
                <i className="level-2" />
                <i className="level-3" />
                <i className="level-4" />
                <span>多</span>
              </div>
            </div>
          </div>
        </section>

        <section className="archive-categories">
          <div className="archive-section-head archive-section-head-row">
            <h2>
              <i className="fa-solid fa-folder-tree" aria-hidden="true" /> 分类
            </h2>
            <p>{categoryList.length} 个</p>
          </div>
          <div className="archive-category-panel">
            <div className="archive-category-grid">
              {categoryList.length === 0 ? <p className="empty">还没有分类</p> : null}
              {categoryList.map((category: any, index: number) => {
                const latestPost = latest.get(Number(category.id));
                return (
                  <Link
                    key={category.id}
                    prefetch={false}
                    href={`/categories/${category.slug}`}
                    className={`archive-category-card cat-color-${categoryColor(index)}`}
                  >
                    <div className="archive-category-main">
                      <span className="archive-category-icon">
                        <i className={category.icon || 'fa-regular fa-folder'} aria-hidden="true" />
                      </span>
                      <div>
                        <h3>{category.name}</h3>
                        <span>{Number(category.count || 0)} 篇</span>
                      </div>
                    </div>
                    {category.description ? <p>{category.description}</p> : null}
                    {latestPost ? (
                      <div className="archive-category-foot">
                        <span>
                          <i className="fa-regular fa-pen-to-square" aria-hidden="true" /> {latestPost.title}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {tagList.length ? (
          <section className="archive-categories">
            <div className="archive-section-head archive-section-head-row">
              <h2>
                <i className="fa-solid fa-tags" aria-hidden="true" /> 标签
              </h2>
              <p>{tagList.length} 个</p>
            </div>
            <div className="archive-category-grid">
              {tagList.map((tag: any, index: number) => (
                <Link
                  key={tag.id}
                  prefetch={false}
                  href={`/tags/${tag.slug}`}
                  className={`archive-category-card cat-color-${categoryColor(index)}`}
                >
                  <div className="archive-category-main">
                    <span className="archive-category-icon">
                      <i className="fa-solid fa-tag" aria-hidden="true" />
                    </span>
                    <div>
                      <h3>#{tag.name}</h3>
                      <span>{Number(tag.count || 0)} 篇</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="archive-years">
          {years.length === 0 ? <p className="empty">还没有文章</p> : null}
          {years.map((group) => {
            const total = group.months.reduce((sum, month) => sum + month.posts.length, 0);
            return (
              <article className="archive-year" key={group.year}>
                <header className="archive-year-head">
                  <h2>{group.year}</h2>
                  <span>{total} 篇</span>
                </header>
                {group.months.map((month) => (
                  <div key={month.month}>
                    <div className="archive-month-head">
                      <strong>{month.label}</strong>
                      <span>{month.posts.length} 篇</span>
                    </div>
                    <div className="archive-post-list">
                      {month.posts.map((post: any) => {
                        const { month: postMonth, day: postDay } = datePartsInTimeZone(postDateInput(post), timeZone);
                        const icon = firstCategory(post)?.icon || 'fa-regular fa-file-lines';
                        return (
                          <PostLink key={post.id} post={post} className="archive-post-row">
                            <time dateTime={String(postDateInput(post) || '')}>
                              {postMonth && postDay ? `${String(postMonth).padStart(2, '0')}-${String(postDay).padStart(2, '0')}` : ''}
                            </time>
                            <i className={icon} aria-hidden="true" />
                            <span className="archive-post-title">{post.title}</span>
                            <span className="archive-post-meta">
                              <span>
                                <i className="fa-regular fa-comment" aria-hidden="true" /> {Number(post.comment_count || 0)}
                              </span>
                              <span>
                                <i className="fa-regular fa-eye" aria-hidden="true" /> {Number(post.view_count || 0)}
                              </span>
                            </span>
                          </PostLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </article>
            );
          })}
        </section>
      </div>
    </section>
  );
}
