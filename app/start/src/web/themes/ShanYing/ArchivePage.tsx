'use client';

/**
 * ShanYing · 归档页
 *
 * 对照原主题 pages/archives.php：头部统计 → 近一年更新热力图 → 分类总览
 * （四列，带图标、描述、最新一篇）→ 年/月/日时间线 → 标签云。
 */

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { datePartsInTimeZone, formatMonthDayInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import { renderCatIcon, relativeTime, ShanYingYearHeatmap } from './shanying-shared';

interface YearGroup {
  year: number;
  months: { month: number; label: string; posts: any[] }[];
}

function groupByYearMonth(posts: any[], timeZone: string): YearGroup[] {
  const yearMap = new Map<number, Map<number, any[]>>();
  for (const post of posts) {
    const { year, month } = datePartsInTimeZone(postDateInput(post), timeZone);
    if (!year || !month) continue;
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    const index = month - 1;
    if (!monthMap.has(index)) monthMap.set(index, []);
    monthMap.get(index)!.push(post);
  }
  return Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, monthMap]) => ({
      year,
      months: Array.from(monthMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, posts]) => ({ month, label: `${month + 1}月`, posts })),
    }));
}

function latestPerCategory(posts: any[], categories: any[]) {
  const result: Record<number, any> = {};
  for (const category of categories) {
    const found = posts.find((post: any) => post?.categories?.some((item: any) => item.id === category.id));
    if (found) result[category.id] = found;
  }
  return result;
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
  const sortedTags = [...tags].sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
  const latest = latestPerCategory(posts, categories);

  const headline = [
    { value: stats?.post_count || posts.length, label: '篇文章' },
    { value: categories.length, label: '个分类' },
    { value: stats?.word_count || 0, label: '字' },
    { value: stats?.total_views || 0, label: '次浏览' },
  ];

  return (
    <div className="sy-archive">
      <header className="sy-archive-head">
        <h1>
          <span className="sy-archive-title-icon" aria-hidden="true">
            <i className="fa-regular fa-books" />
          </span>
          归档
        </h1>
        <div className="sy-archive-stats">
          {headline.map((item) => (
            <span key={item.label}>
              <b>{Number(item.value || 0).toLocaleString()}</b> {item.label}
            </span>
          ))}
        </div>
      </header>

      <section className="sy-archive-block">
        <header className="sy-archive-block-head">
          <h2><i className="fa-solid fa-chart-column" aria-hidden="true" /> 文章更新记录</h2>
          <span>近一年 · {stats?.post_count || posts.length} 篇文章</span>
        </header>
        <ShanYingYearHeatmap data={stats?.heatmap || []} timeZone={timeZone} />
      </section>

      <section className="sy-archive-block">
        <header className="sy-archive-block-head">
          <h2><i className="fa-solid fa-folder" aria-hidden="true" /> 分类</h2>
          <span>{categories.length} 个</span>
        </header>
        <div className="sy-archive-cats">
          {categories.map((category: any) => {
            const post = latest[category.id];
            return (
              <div className="sy-archive-cat" key={category.id}>
                <header>
                  <Link href={`/categories/${category.slug}`}>
                    {renderCatIcon(category.icon, 18)}
                    <span>{category.name}</span>
                  </Link>
                  <span>{category.count || 0} 篇</span>
                </header>
                <p>{category.description || `关于${category.name}的记录与分享。`}</p>
                {post && (
                  <PostLink post={post} prefetch className="sy-archive-cat-latest">
                    <span>{post.title}</span>
                    {/* 相对时间在 SSR 与客户端水合之间可能跨桶，跳过比对 */}
                    <time dateTime={String(postDateInput(post))} suppressHydrationWarning>{relativeTime(postDateInput(post))}</time>
                  </PostLink>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <ArchivePostTimeline posts={posts} timeZone={timeZone} />

      <section className="sy-archive-block">
        <header className="sy-archive-block-head">
          <h2><i className="fa-solid fa-tag" aria-hidden="true" /> 标签</h2>
          <span>{sortedTags.length} 个</span>
        </header>
        <div className="sy-archive-tags">
          {sortedTags.map((tag: any) => (
            <Link key={tag.id} href={`/tags/${tag.slug}`}>
              #{tag.name}
              <sup>{tag.count || 0}</sup>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

export function ArchivePostTimeline({
  posts,
  timeZone,
}: {
  posts: any[];
  timeZone: string;
}) {
  const timeline = groupByYearMonth(posts, timeZone);

  return (
    <section className="sy-archive-timeline">
      {timeline.length === 0 && <p className="sy-archive-empty">这里还没有文章。</p>}
      {timeline.map((group) => (
        <div className="sy-archive-year" key={group.year}>
          <header>
            <Link href={`/date/${group.year}`}>{group.year}</Link>
            <span>{group.months.reduce((sum, month) => sum + month.posts.length, 0)} 篇</span>
          </header>
          {group.months.map((month) => (
            <div className="sy-archive-month" key={month.month}>
              <Link className="sy-archive-month-head" href={`/date/${group.year}/${String(month.month + 1).padStart(2, '0')}`}>
                <h3>{month.label}</h3>
                <span>{month.posts.length} 篇</span>
              </Link>
              <ol>
                {month.posts.map((post: any) => {
                  const cat = post.categories?.[0];
                  return (
                    <li key={post.id}>
                      <time dateTime={String(postDateInput(post))}>{formatMonthDayInTimeZone(postDateInput(post), timeZone)}</time>
                      <PostLink post={post} prefetch className="sy-archive-post">
                        {renderCatIcon(cat?.icon, 14)}
                        <span>{post.title}</span>
                      </PostLink>
                      <span className="sy-archive-post-stats">
                        <span><i className="fa-regular fa-comment" aria-hidden="true" /> {post.comment_count || 0}</span>
                        <span><i className="fa-regular fa-eye" aria-hidden="true" /> {post.view_count || 0}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
