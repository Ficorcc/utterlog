'use client';

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import PostContent from './PostContent';
import { useThemeContext } from '@/lib/theme-context';
import { datePartsInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

/**
 * 关于页：上游没有独立模板，这里沿用独立页面模板（page.php）
 * 的 .page-detail + .page-content 结构。
 *
 *   .page-detail
 *     h1                        页面标题
 *     .page-content             站点简介 / Markdown 自述 / 统计 / 最近更新
 */
export default function AboutPage({ recentPosts = [] }: { recentPosts?: any[] }) {
  const { site, owner, options, archiveStats, tags, timeZone } = useThemeContext();
  const recent = Array.isArray(recentPosts) ? recentPosts : [];
  const markdown = String(options?.page_about_markdown || '').trim();
  const socials = Object.entries(owner?.socials || {}).filter(([, value]) => Boolean(value));

  const headline = [
    { value: Number(archiveStats?.post_count || 0), label: '篇文章' },
    { value: Number(archiveStats?.comment_count || 0), label: '条评论' },
    { value: Array.isArray(tags) ? tags.length : 0, label: '个标签' },
    { value: Number(archiveStats?.days || 0), label: '天' },
  ];

  return (
    <article className="page-detail">
      <h1>关于</h1>
      <div className="page-content">
        <p>{site?.description || site?.subtitle || owner?.bio || '这是关于这个站点的小角落。'}</p>

        {markdown ? <PostContent content={markdown} /> : null}

        {!markdown && owner?.bio ? <p>{owner.bio}</p> : null}

        <div className="archive-stats" aria-label="站点统计">
          {headline.map((item) => (
            <span key={item.label}>
              <strong>{item.value.toLocaleString()}</strong> {item.label}
            </span>
          ))}
        </div>

        {socials.length ? (
          <div className="footer-socials">
            {socials.map(([key, url]) => (
              <a key={key} href={String(url)} className="footer-social" title={key} aria-label={key} target="_blank" rel="nofollow noopener">
                <i className="fa-solid fa-link" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}

        <h2>最近更新</h2>
        {recent.length === 0 ? <p className="empty">还没有文章</p> : null}
        {recent.map((post: any, index: number) => {
          const { month, day } = datePartsInTimeZone(postDateInput(post), timeZone);
          return (
            <article className="post-compact-row" key={post.id}>
              <PostLink post={post} className="post-compact-link">
                <span className="post-compact-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="post-compact-title">{post.title}</span>
                <span className="post-compact-side" aria-hidden="true">
                  <span className="post-compact-date">
                    {month && day ? `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''}
                  </span>
                </span>
              </PostLink>
            </article>
          );
        })}

        <p>
          <Link prefetch={false} href="/guestbook">
            <i className="fa-regular fa-message-lines" aria-hidden="true" /> 去留言板打个招呼
          </Link>
        </p>
      </div>
    </article>
  );
}
