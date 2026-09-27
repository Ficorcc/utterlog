'use client';

/**
 * ShanYing · 站点控制面板（/dashboard）
 *
 * 对照 WP 原主题 header.php 的 feng-dashboard + template-parts/dashboard.php：
 * 原主题是一个由头部网格按钮唤起的浮层，这里按需求改成独立页面，头部右上角
 * 三条横线按钮进入。
 *
 * 结构：
 *   头部 —— kicker（站名 / EXPLORE）+ 标题 + 统计摘要面板
 *   分类浏览 —— 文件夹卡片横排（全部存档 → /archives）
 *   主栏 —— 最新文章 / 热门阅读 / 最近说说 / 最近评论
 *   侧栏 —— 文章日历（近一年有文章的日期可点）/ 热门标签 / 友情链接
 *
 * 数据分工：文章/说说/评论/友链由 /dashboard 的 loader 取；
 * 统计、分类、标签、日历（archiveStats.heatmap 近一年按天计数）走 ThemeContext。
 */

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import {
  datePartsInTimeZone,
  formatDateInTimeZone,
  resolveSiteTimeZone,
} from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import { Icon, plainText, relativeTime, renderCatIcon, useReveal } from './shanying-shared';
import { useMemo, useState } from 'react';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/* ── 文章日历 ─────────────────────────────────────────────────────
 * heatmap 只有近一年，所以向前最多翻 12 个月，向后不允许翻过当月。
 * 有文章的日期高亮并链接到 /date/Y/M/D；今天描一圈强调色。
 */
function DashboardCalendar({ heatmap, timeZone }: { heatmap: any[]; timeZone: string }) {
  const today = datePartsInTimeZone(new Date(), timeZone);
  const [view, setView] = useState({ year: today.year, month: today.month });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of heatmap || []) {
      if (cell?.date) map.set(String(cell.date), Number(cell.count) || 0);
    }
    return map;
  }, [heatmap]);

  const year = view.year;
  const month = view.month; // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  // 周一为一周之首：JS getDay() 周日=0 → (day+6)%7
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const monthKey = (value: { year: number; month: number }) => value.year * 12 + value.month;
  const currentKey = monthKey({ year: today.year, month: today.month });
  const earliest = useMemo(() => {
    const dates = Array.from(counts.keys()).map((date) => {
      const [y, m] = date.split('-').map(Number);
      return { year: y, month: m };
    }).filter((item) => item.year && item.month);
    if (!dates.length) return { year: today.year, month: today.month };
    return dates.reduce((acc, item) => (monthKey(item) < monthKey(acc) ? item : acc));
  }, [counts, today.year, today.month]);

  const canPrev = monthKey({ year, month }) > monthKey(earliest);
  const canNext = monthKey({ year, month }) < currentKey;
  const shift = (delta: number) => {
    const next = monthKey({ year, month }) + delta;
    setView({ year: Math.floor(next / 12), month: (((next % 12) + 12) % 12) + 1 });
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const isToday = (day: number) => today.year === year && today.month === month && today.day === day;
  const dateKey = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div className="sy-dash-calendar">
      <div className="sy-dash-cal-toolbar">
        <button
          type="button"
          aria-label="上一月"
          disabled={!canPrev}
          onClick={() => shift(-1)}
        >
          <Icon name="previous" />
        </button>
        <strong>{year} 年 {month} 月</strong>
        <button
          type="button"
          aria-label="下一月"
          disabled={!canNext}
          onClick={() => shift(1)}
        >
          <Icon name="next" />
        </button>
      </div>
      <div className="sy-dash-cal-grid" role="grid" aria-label={`${year} 年 ${month} 月文章日历`}>
        {WEEK_LABELS.map((label) => (
          <span key={label} className="sy-dash-cal-week" aria-hidden="true">{label}</span>
        ))}
        {cells.map((day, index) => {
          if (day == null) return <span key={`blank-${index}`} />;
          const count = counts.get(dateKey(day)) || 0;
          const hasPost = count > 0;
          return hasPost ? (
            <Link
              key={day}
              prefetch={false}
              href={`/date/${year}/${month}/${day}`}
              className="sy-dash-cal-day"
              data-has-post="1"
              data-today={isToday(day) ? '1' : undefined}
              title={`${month} 月 ${day} 日 · ${count} 篇文章`}
            >
              {day}
            </Link>
          ) : (
            <span key={day} className="sy-dash-cal-day" data-today={isToday(day) ? '1' : undefined}>
              {day}
            </span>
          );
        })}
      </div>
      <p className="sy-dash-cal-note">带圆点的日期有文章，点击即可阅读。</p>
    </div>
  );
}

export default function DashboardPage({
  posts = [],
  hotPosts = [],
  moments = [],
  momentTotal = 0,
  comments = [],
  links = [],
  categories = [],
  tags = [],
  stats = {},
  timeZone = '',
  siteTitle = '',
}: {
  posts?: any[];
  hotPosts?: any[];
  moments?: any[];
  momentTotal?: number;
  comments?: any[];
  links?: any[];
  categories?: any[];
  tags?: any[];
  stats?: any;
  timeZone?: string;
  siteTitle?: string;
}) {
  const ctx = useThemeContext();
  const tz = timeZone || ctx.timeZone || resolveSiteTimeZone(ctx.options);
  const kicker = (siteTitle || ctx.site.title || 'ShanYing').toUpperCase();
  const { ref: revealRef, pending: revealPending } = useReveal<HTMLDivElement>('0px');

  const activeCategories = categories.filter((category: any) => (category.count || 0) > 0);
  const sortedTags = [...tags].sort((a: any, b: any) => (b.count || 0) - (a.count || 0)).slice(0, 12);
  const visibleComments = comments.slice(0, 6);
  const visibleLinks = links.slice(0, 10);

  const summary = [
    { label: '文章', value: stats?.post_count ?? posts.length },
    { label: '说说', value: momentTotal },
    { label: '评论', value: stats?.comment_count ?? 0 },
    { label: '分类', value: activeCategories.length },
    { label: '浏览量', value: stats?.total_views ?? 0 },
    { label: '总字数', value: stats?.word_count ?? 0 },
    { label: '建站天数', value: stats?.days > 0 ? stats.days : null },
  ];

  const renderPostRows = (list: any[], empty: string) => (
    list.length === 0 ? <p className="sy-dash-empty">{empty}</p> : (
      <ul className="sy-dash-posts">
        {list.map((post: any) => {
          const when = postDateInput(post);
          return (
            <li key={post.id}>
              <PostLink post={post} className="sy-dash-post-row">
                <time dateTime={when ? String(when) : undefined}>
                  {formatDateInTimeZone(when, 'en-GB', { month: '2-digit', day: '2-digit' }, tz).replace(/\//g, '-')}
                </time>
                <span>{post.title}</span>
              </PostLink>
            </li>
          );
        })}
      </ul>
    )
  );

  return (
    <div className="sy-dash" data-pending={revealPending ? '1' : undefined} ref={revealRef}>
      {/* ── 头部：标题 + 统计摘要 ── */}
      <header className="sy-dash-head">
        <div className="sy-dash-intro">
          <p className="sy-dash-kicker">{kicker} / EXPLORE</p>
          <h1>站点控制面板</h1>
          <p className="sy-dash-subtitle">文章、说说、分类与近况，都在这里。</p>
        </div>
        <div className="sy-dash-summary" aria-label="站点统计">
          {summary.map((item) => (
            <div key={item.label}>
              <strong>{item.value == null ? '未设置' : Number(item.value).toLocaleString()}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── 分类浏览 ── */}
      <section className="sy-dash-section" aria-labelledby="sy-dash-categories-title">
        <header>
          <h2 id="sy-dash-categories-title"><Icon name="folder" solid /> 分类浏览</h2>
          <Link prefetch={false} href="/archives">全部存档</Link>
        </header>
        {activeCategories.length === 0 ? (
          <p className="sy-dash-empty">还没有公开的文章分类。</p>
        ) : (
          <div className="sy-dash-categories">
            {activeCategories.map((category: any) => (
              <Link key={category.id} prefetch={false} href={`/categories/${category.slug}`} className="sy-dash-category">
                <span className="sy-dash-category-icon" aria-hidden="true">
                  {renderCatIcon(category.icon, 20)}
                </span>
                <strong>{category.name}</strong>
                <b>{category.count || 0}</b>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="sy-dash-workspace">
        {/* ── 主栏 ── */}
        <div className="sy-dash-main">
          <div className="sy-dash-reading">
            <section className="sy-dash-section" aria-labelledby="sy-dash-recent-title">
              <header>
                <h2 id="sy-dash-recent-title"><Icon name="edit" solid /> 最新文章</h2>
              </header>
              {renderPostRows(posts, '新的记录正在路上。')}
            </section>
            <section className="sy-dash-section" aria-labelledby="sy-dash-hot-title">
              <header>
                <h2 id="sy-dash-hot-title"><Icon name="reading" solid /> 热门阅读</h2>
              </header>
              {renderPostRows(hotPosts, '还没有公开文章。')}
            </section>
          </div>

          <section className="sy-dash-section" aria-labelledby="sy-dash-moments-title">
            <header>
              <h2 id="sy-dash-moments-title"><Icon name="comment" solid /> 最近说说</h2>
              <Link prefetch={false} href="/moments">全部说说</Link>
            </header>
            {moments.length === 0 ? (
              <p className="sy-dash-empty">还没有说说。</p>
            ) : (
              <div className="sy-dash-talks">
                {moments.map((moment: any) => (
                  <Link key={moment.id} prefetch={false} href="/moments" className="sy-dash-talk">
                    <time suppressHydrationWarning>{relativeTime(moment.created_at) || '刚刚'}</time>
                    <span>{plainText(moment.content).slice(0, 100) || '分享了一条说说'}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="sy-dash-section" aria-labelledby="sy-dash-comments-title">
            <header>
              <h2 id="sy-dash-comments-title"><Icon name="comment" /> 最近评论</h2>
            </header>
            {visibleComments.length === 0 ? (
              <p className="sy-dash-empty">还没有留言，来留下第一句话吧。</p>
            ) : (
              <div className="sy-dash-comments">
                {visibleComments.map((comment: any, index: number) => (
                  <Link
                    key={comment.id || index}
                    prefetch={false}
                    href={`${comment.post_slug ? `/posts/${comment.post_slug}` : '/'}#comment-${comment.id}`}
                    className="sy-dash-comment"
                  >
                    <span className="sy-dash-avatar" aria-hidden="true">
                      <img
                        src={comment.author_avatar || comment.avatar_url || ''}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                      />
                    </span>
                    <span className="sy-dash-comment-body">
                      <span className="sy-dash-comment-byline">
                        <strong>{comment.author || '访客'}</strong>
                        <time suppressHydrationWarning>{relativeTime(comment.created_at) || ''}</time>
                      </span>
                      <span className="sy-dash-comment-excerpt">{plainText(comment.content).slice(0, 90)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── 侧栏 ── */}
        <aside className="sy-dash-sidebar">
          <section className="sy-dash-section" aria-labelledby="sy-dash-calendar-title">
            <header>
              <h2 id="sy-dash-calendar-title"><Icon name="calendar" /> 文章日历</h2>
            </header>
            <DashboardCalendar heatmap={stats?.heatmap || []} timeZone={tz} />
          </section>

          <section className="sy-dash-section" aria-labelledby="sy-dash-tags-title">
            <header>
              <h2 id="sy-dash-tags-title"><Icon name="hash" solid /> 热门标签</h2>
            </header>
            {sortedTags.length === 0 ? (
              <p className="sy-dash-empty">还没有标签。</p>
            ) : (
              <div className="sy-dash-tags">
                {sortedTags.map((tag: any) => (
                  <Link key={tag.id} prefetch={false} href={`/tags/${tag.slug}`}>
                    {tag.name}
                    <small>{tag.count || 0}</small>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="sy-dash-section" aria-labelledby="sy-dash-links-title">
            <header>
              <h2 id="sy-dash-links-title"><Icon name="link" /> 友情链接</h2>
              <Link prefetch={false} href="/links">全部友链</Link>
            </header>
            {visibleLinks.length === 0 ? (
              <p className="sy-dash-empty">还没有公开的友情链接。</p>
            ) : (
              <div className="sy-dash-friends">
                {visibleLinks.map((link: any, index: number) => (
                  <a
                    key={`${link.url}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.description || link.name}
                  >
                    <span className="sy-dash-friend-avatar" aria-hidden="true">
                      <img
                        src={link.avatar || link.logo || ''}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                      />
                    </span>
                    <span>{link.name}</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
