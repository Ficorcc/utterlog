'use client';

import { useMemo, useState } from 'react';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { IconArchive, IconChat, IconEye } from './Icons';
import { formatDay, formatWeek, toDate } from './utils';

interface ArchivePost {
  id: number;
  slug?: string;
  title?: string;
  view_count?: number;
  comment_count?: number;
  published_at?: string | number | null;
  created_at?: string | number;
}

interface ArchiveProps {
  posts: ArchivePost[];
  categories?: unknown[];
  tags?: unknown[];
  stats?: { post_count?: number; comment_count?: number; total_views?: number; days?: number };
  timeZone?: string;
}

/**
 * 归档页：按年份 / 月份分组，样式沿用原主题 archive-page.php 的玻璃卡片。
 */
export default function ArchivePage({ posts, stats }: ArchiveProps) {
  const { site } = useThemeContext();
  const list = Array.isArray(posts) ? posts : [];

  const grouped = useMemo(() => {
    const years = new Map<number, Map<number, ArchivePost[]>>();
    for (const post of list) {
      const date = toDate(post.published_at || post.created_at);
      if (!date) continue;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year)!;
      if (!months.has(month)) months.set(month, []);
      months.get(month)!.push(post);
    }
    return Array.from(years.entries()).sort((a, b) => b[0] - a[0]);
  }, [list]);

  const [activeYear, setActiveYear] = useState<number | null>(null);
  const year = activeYear ?? grouped[0]?.[0] ?? 0;

  const totalPosts = list.length || Number(stats?.post_count || 0);
  const totalViews = Number(stats?.total_views || 0);
  const viewsText = totalViews >= 10000
    ? `${Math.round((totalViews / 10000) * 10) / 10}万`
    : String(totalViews);
  const firstYear = grouped.length ? grouped[grouped.length - 1][0] : '—';

  return (
    <article className="article standalone-page arch-page">
      <section className="gb-hero arch-hero">
        <span className="gb-deco arch-deco" aria-hidden="true">
          <IconArchive size={26} />
        </span>
        <div className="gb-hero-body">
          <span className="gb-badge">
            <IconArchive size={13} />
            Archive · 归档
          </span>
          <h1 className="gb-title">归档</h1>
          <p className="gb-sub">写过的日子都收在这里，按年份慢慢翻。</p>
          {grouped.length ? (
            <div className="links-category-tabs arch-years" id="linksCategoryTabs">
              {grouped.map(([yearKey, months]) => {
                const count = Array.from(months.values()).reduce((sum, items) => sum + items.length, 0);
                return (
                  <button
                    key={yearKey}
                    type="button"
                    className={yearKey === year ? 'links-cat-tab arch-year-btn active' : 'links-cat-tab arch-year-btn'}
                    onClick={() => setActiveYear(yearKey)}
                  >
                    {yearKey}
                    <span className="links-cat-count">{count} 篇</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="gb-stats">
          <div className="gb-stat">
            <b>{totalPosts}</b>
            <span>篇文章</span>
          </div>
          <div className="gb-stat">
            <b>{grouped.length}</b>
            <span>个年份</span>
          </div>
          <div className="gb-stat">
            <b>{viewsText}</b>
            <span>累计浏览</span>
          </div>
          <div className="gb-stat">
            <b>{firstYear}</b>
            <span>开始记录</span>
          </div>
        </div>
      </section>

      {grouped.length ? (
        <div className="pg-arch-list arch-list" id="archList">
          {grouped
            .filter(([yearKey]) => yearKey === year)
            .map(([yearKey, months]) => (
              <div className="links-category-group arch-year" key={yearKey} data-category={yearKey}>
                {Array.from(months.entries())
                  .sort((a, b) => b[0] - a[0])
                  .map(([month, items]) => (
                    <div className="arch-month" key={month}>
                      <b>{month}月</b>
                      <span>{items.length} 篇</span>
                      <i />
                    </div>
                  ))}
                {Array.from(months.entries())
                  .sort((a, b) => b[0] - a[0])
                  .flatMap(([, items]) => items)
                  .map((post) => (
                    <PostLink className="pg-arch-row" key={post.id} post={post}>
                      <span className="pg-arch-row-dot" />
                      <span className="pg-arch-row-date">
                        <b>{formatDay(post.published_at || post.created_at)}</b>
                        <i>{formatWeek(post.published_at || post.created_at)}</i>
                      </span>
                      <span className="pg-arch-row-title">{post.title}</span>
                      <span className="pg-arch-row-meta">
                        {Number(post.view_count || 0) > 0 ? (
                          <span>
                            <IconEye size={12} /> {post.view_count}
                          </span>
                        ) : null}
                        {Number(post.comment_count || 0) > 0 ? (
                          <span>
                            <IconChat size={12} /> {post.comment_count}
                          </span>
                        ) : null}
                      </span>
                    </PostLink>
                  ))}
              </div>
            ))}
        </div>
      ) : (
        <p className="arch-empty">
          <IconArchive size={16} /> 还没有可归档的文章
        </p>
      )}

      <p className="arch-foot-note">共 {totalPosts} 篇文章 · {site.title}</p>
    </article>
  );
}
