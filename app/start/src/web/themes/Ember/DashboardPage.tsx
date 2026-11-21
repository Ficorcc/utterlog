'use client';

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { datePartsInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

/**
 * 站点控制面板：上游没有独立的仪表盘页，这里借用动态页
 * （pages/activity.php）的 .activity-page / .activity-panel 结构，
 * 配合归档页的统计与列表样式。
 *
 *   .activity-page
 *     .activity-hero              标题
 *     .activity-panel              概览统计
 *     .activity-panel              最新文章 / 热门阅读 / 最近说说 / 最近评论 / 最近说说评论
 *     .activity-panel              友情链接
 */

/** 相对时间：面板里只关心「什么时候」 */
function relativeTime(timestamp: any) {
  const value = Number(timestamp || 0);
  if (!value) return '';
  const seconds = value > 1e12 ? Math.floor(value / 1000) : value;
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return `${Math.floor(diff / 2592000)} 个月前`;
}

export default function DashboardPage({
  posts = [],
  hotPosts = [],
  moments = [],
  momentTotal = 0,
  comments = [],
  momentComments = [],
  links = [],
  stats = {},
  timeZone = 'UTC',
  siteTitle = '',
}: {
  posts?: any[];
  hotPosts?: any[];
  moments?: any[];
  momentTotal?: number;
  comments?: any[];
  momentComments?: any[];
  links?: any[];
  stats?: any;
  timeZone?: string;
  siteTitle?: string;
}) {
  const { site } = useThemeContext();
  const postList = Array.isArray(posts) ? posts : [];
  const hotList = Array.isArray(hotPosts) ? hotPosts : [];
  const momentList = Array.isArray(moments) ? moments : [];
  const commentList = Array.isArray(comments) ? comments : [];
  const momentCommentList = Array.isArray(momentComments) ? momentComments : [];
  const linkList = Array.isArray(links) ? links : [];

  // 面板只展示前 6 条，其余内容去对应的归档页 / 说说页看
  const visiblePosts = postList.slice(0, 6);
  const visibleHotPosts = hotList.slice(0, 6);
  const visibleMoments = momentList.slice(0, 6);

  const title = siteTitle || site?.title || 'Utterlog';

  const headline = [
    { value: Number(stats?.post_count || postList.length), label: '篇文章' },
    { value: Number(momentTotal || momentList.length), label: '条说说' },
    { value: Number(stats?.comment_count || commentList.length), label: '条评论' },
    { value: Number(stats?.word_count || 0), label: '字' },
    { value: Number(stats?.total_views || 0), label: '次浏览' },
    { value: Number(stats?.days || 0), label: '建站天数' },
  ];

  return (
    <section className="activity-page">
      <header className="activity-hero">
        <div className="activity-hero-main">
          <div className="activity-title-mark">
            <span aria-hidden="true" />
            <i className="fa-solid fa-gauge-high" aria-hidden="true" />
            <b>DASHBOARD</b>
            <em>控制台</em>
          </div>
          <p>{title} 的文章、说说、评论与友链，都在这里。</p>
        </div>
      </header>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>站点概览</h3>
          <span>{title}</span>
        </div>
        <div className="archive-stats" aria-label="站点统计">
          {headline.map((item) => (
            <span key={item.label}>
              <strong>{item.value.toLocaleString()}</strong> {item.label}
            </span>
          ))}
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-regular fa-file-lines" aria-hidden="true" /> 最新文章
          </h3>
          <Link prefetch={false} href="/archives">
            全部归档
          </Link>
        </div>
        {visiblePosts.length === 0 ? <p className="empty">还没有文章</p> : null}
        <div className="archive-post-list">
          {visiblePosts.map((post: any) => {
            const { month, day } = datePartsInTimeZone(postDateInput(post), timeZone);
            return (
              <PostLink key={post.id} post={post} className="archive-post-row">
                <time dateTime={String(postDateInput(post) || '')}>
                  {month && day ? `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''}
                </time>
                <i className="fa-regular fa-file-lines" aria-hidden="true" />
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
      </section>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-solid fa-fire" aria-hidden="true" /> 热门阅读
          </h3>
          <span>按阅读量排序</span>
        </div>
        {visibleHotPosts.length === 0 ? <p className="empty">还没有公开文章</p> : null}
        <div className="archive-post-list">
          {visibleHotPosts.map((post: any) => (
            <PostLink key={post.id} post={post} className="archive-post-row">
              <time dateTime={String(postDateInput(post) || '')}>{relativeTime(post.published_at || post.created_at)}</time>
              <i className="fa-solid fa-fire" aria-hidden="true" />
              <span className="archive-post-title">{post.title}</span>
              <span className="archive-post-meta">
                <span>
                  <i className="fa-regular fa-eye" aria-hidden="true" /> {Number(post.view_count || 0)}
                </span>
              </span>
            </PostLink>
          ))}
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-solid fa-head-side-speak" aria-hidden="true" /> 最近说说
          </h3>
          <Link prefetch={false} href="/moments">
            全部说说
          </Link>
        </div>
        {visibleMoments.length === 0 ? <p className="empty">还没有说说</p> : null}
        <div className="archive-post-list">
          {visibleMoments.map((moment: any) => (
            <div className="archive-post-row" key={moment.id}>
              <time dateTime={String(moment.created_at || '')}>{relativeTime(moment.created_at)}</time>
              <i className="fa-solid fa-comment-dots" aria-hidden="true" />
              <span className="archive-post-title">{String(moment.content || '').slice(0, 60)}</span>
              <span className="archive-post-meta">
                <span>
                  <i className="fa-regular fa-thumbs-up" aria-hidden="true" /> {Number(moment.like_count || 0)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-regular fa-comment" aria-hidden="true" /> 最近评论
          </h3>
          <span>{commentList.length} 条</span>
        </div>
        {commentList.length === 0 ? <p className="empty">还没有评论</p> : null}
        <div className="archive-post-list">
          {commentList.map((comment: any, index: number) => (
            <div className="archive-post-row" key={comment.id || index}>
              <time dateTime={String(comment.created_at || '')}>{relativeTime(comment.created_at)}</time>
              <i className="fa-regular fa-user" aria-hidden="true" />
              <span className="archive-post-title">
                {comment.author || '访客'}：{String(comment.content || '').slice(0, 60)}
              </span>
              <span className="archive-post-meta">
                <span>
                  <i className="fa-regular fa-file-lines" aria-hidden="true" /> {comment.post_title || comment.post_slug || '文章'}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-solid fa-comment-dots" aria-hidden="true" /> 最近说说评论
          </h3>
          <Link prefetch={false} href="/moments">
            全部说说
          </Link>
        </div>
        {momentCommentList.length === 0 ? <p className="empty">还没有说说评论</p> : null}
        <div className="archive-post-list">
          {momentCommentList.map((comment: any, index: number) => (
            <div className="archive-post-row" key={comment.id || index}>
              <time dateTime={String(comment.created_at || '')}>{relativeTime(comment.created_at)}</time>
              <i className="fa-regular fa-comment" aria-hidden="true" />
              <span className="archive-post-title">
                {comment.author || '访客'}：{String(comment.content || '').slice(0, 60)}
              </span>
              <span className="archive-post-meta">
                <span>
                  <i className="fa-solid fa-comment-dots" aria-hidden="true" />
                  <span className="dashboard-moment-ref">{comment.moment_content || '说说'}</span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-solid fa-user-group" aria-hidden="true" /> 友情链接
          </h3>
          <Link prefetch={false} href="/links">
            全部友链
          </Link>
        </div>
        {linkList.length === 0 ? <p className="empty">还没有友情链接</p> : null}
        <div className="friend-list">
          {linkList.map((link: any) => {
            const host = String(link.url || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
            const logo = link.logo || link.avatar || (host ? `https://favicon.im/${encodeURIComponent(host)}` : '');
            return (
              <a key={link.id} className="friend-row" href={link.url} target="_blank" rel="nofollow noopener">
                {logo ? (
                  <img
                    className="friend-logo"
                    src={logo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                ) : (
                  <span className="friend-logo" aria-hidden="true" />
                )}
                <span className="friend-info">
                  <strong>{link.name}</strong>
                  {link.description ? (
                    <>
                      <span>-</span>
                      <em>{link.description}</em>
                    </>
                  ) : null}
                </span>
                <span className="friend-host">{host}</span>
              </a>
            );
          })}
        </div>
      </section>
    </section>
  );
}
