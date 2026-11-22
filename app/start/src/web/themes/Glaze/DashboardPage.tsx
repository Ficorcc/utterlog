'use client';

import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { dateLabel, excerptOf, stripHtml } from './utils';

/**
 * 站点仪表盘。
 *
 *   header.page-heading.glaze-panel
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span（站点名）
 *   ul.archive-stats[role=list]              文章 / 评论 / 说说 / 链接 / 分类 / 标签
 *   section.dashboard-section.glaze-panel × 4
 *     最近文章 / 热门文章：div.post-list > article.post-card.glaze-panel
 *     最新评论：div.dashboard-comment
 *     最新说说：div.dashboard-moment
 */

/** 时间戳 → ISO 字符串，供 <time dateTime> 使用 */
function isoTime(value: any): string {
  const num = Number(value);
  if (num > 0) {
    const date = new Date(num > 1e12 ? num : num * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const text = String(value || '').trim();
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export default function DashboardPage({
  posts = [],
  hotPosts = [],
  moments = [],
  momentTotal = 0,
  comments = [],
  momentComments = [],
  links = [],
  categories = [],
  tags = [],
  stats = {},
  timeZone,
  siteTitle,
}: {
  posts?: any[];
  hotPosts?: any[];
  moments?: any[];
  momentTotal?: number;
  comments?: any[];
  momentComments?: any[];
  links?: any[];
  categories?: any[];
  tags?: any[];
  stats?: any;
  timeZone?: string;
  siteTitle?: string;
}) {
  const { site, timeZone: contextTimeZone } = useThemeContext();
  const zone = timeZone || contextTimeZone || 'UTC';

  const postList = Array.isArray(posts) ? posts : [];
  const hotList = Array.isArray(hotPosts) ? hotPosts : [];
  const momentList = Array.isArray(moments) ? moments : [];
  const commentList = Array.isArray(comments) ? comments : [];
  const linkList = Array.isArray(links) ? links : [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const tagList = Array.isArray(tags) ? tags : [];

  const visiblePosts = postList.slice(0, 6);
  const visibleHotPosts = hotList.slice(0, 6);
  const visibleComments = commentList.slice(0, 6);
  const visibleMoments = momentList.slice(0, 6);

  const title = String(siteTitle || site?.title || 'Utterlog');

  const headline = [
    { value: Number(stats?.post_count ?? postList.length), label: '篇文章' },
    { value: Number(stats?.comment_count ?? commentList.length), label: '条评论' },
    { value: Number(momentTotal || momentList.length), label: '条说说' },
    { value: linkList.length, label: '个链接' },
    { value: categoryList.length, label: '个分类' },
    { value: tagList.length, label: '个标签' },
  ];

  const renderPostCards = (list: any[]) =>
    list.map((post: any) => {
      const published = post?.published_at || post?.created_at;
      const excerpt = excerptOf(post, 120);
      return (
        <article className="post-card glaze-panel" key={post?.id ?? post?.slug}>
          <div className="post-card-copy">
            <div className="post-card-heading">
              <h2 className="post-card-title">
                <span className="post-card-title-mark" aria-hidden="true">
                  #
                </span>
                <PostLink post={post}>{post?.title}</PostLink>
              </h2>
            </div>
            {excerpt ? <div className="post-excerpt">{excerpt}</div> : null}
            <div className="post-card-footer">
              <div className="post-meta">
                <time className="post-card-date" dateTime={isoTime(published)}>
                  {dateLabel(published, zone)}
                </time>
                <span className="dashboard-post-comments">
                  <i className="fa-regular fa-comment" aria-hidden="true" />
                  {Number(post?.comment_count || 0)}
                </span>
              </div>
            </div>
          </div>
        </article>
      );
    });

  return (
    <div className="glaze-dashboard">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle" aria-hidden="true">
            <span className="glaze-icon" data-glaze-icon="stats" />
          </span>
          <span>{title}</span>
        </h1>
      </header>

      <ul className="archive-stats" role="list" aria-label="站点概览">
        {headline.map((item) => (
          <li key={item.label}>
            <strong>{item.value.toLocaleString()}</strong> {item.label}
          </li>
        ))}
      </ul>

      <section className="dashboard-section glaze-panel">
        <h2 className="dashboard-section-title">最近文章</h2>
        {visiblePosts.length === 0 ? (
          <p className="dashboard-empty">还没有文章</p>
        ) : (
          <div className="post-list">{renderPostCards(visiblePosts)}</div>
        )}
      </section>

      <section className="dashboard-section glaze-panel">
        <h2 className="dashboard-section-title">热门文章</h2>
        {visibleHotPosts.length === 0 ? (
          <p className="dashboard-empty">还没有公开文章</p>
        ) : (
          <div className="post-list">{renderPostCards(visibleHotPosts)}</div>
        )}
      </section>

      <section className="dashboard-section glaze-panel">
        <h2 className="dashboard-section-title">最新评论</h2>
        {visibleComments.length === 0 ? (
          <p className="dashboard-empty">还没有评论</p>
        ) : (
          <div className="dashboard-comments">
            {visibleComments.map((comment: any, index: number) => (
              <div className="dashboard-comment" key={comment?.id ?? index}>
                <span className="dashboard-comment-author">{String(comment?.author || '访客')}</span>
                <span className="dashboard-comment-excerpt">
                  {stripHtml(String(comment?.content || '')).slice(0, 80)}
                </span>
                <time dateTime={isoTime(comment?.created_at)}>{dateLabel(comment?.created_at, zone)}</time>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section glaze-panel">
        <h2 className="dashboard-section-title">最新说说</h2>
        {visibleMoments.length === 0 ? (
          <p className="dashboard-empty">还没有说说</p>
        ) : (
          <div className="dashboard-moments">
            {visibleMoments.map((moment: any, index: number) => (
              <div className="dashboard-moment" key={moment?.id ?? index}>
                <span className="dashboard-moment-excerpt">
                  {stripHtml(String(moment?.content || '')).slice(0, 80)}
                </span>
                <time dateTime={isoTime(moment?.created_at)}>{dateLabel(moment?.created_at, zone)}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
