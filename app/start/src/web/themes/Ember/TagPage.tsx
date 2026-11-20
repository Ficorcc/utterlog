import PostLink from '@/components/blog/PostLink';
import { datePartsInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

/**
 * 标签页：上游没有单独的标签模板，这里沿用文章列表页
 * （pages/home-posts.php）的紧凑列表结构。
 *
 *   .post-list
 *     .posts-hero              标签头
 *     .post-compact-row        文章行
 */
export default function TagPage({
  tag,
  posts = [],
  timeZone = 'UTC',
}: {
  tag: any;
  posts?: any[];
  timeZone?: string;
}) {
  const list = Array.isArray(posts) ? posts : [];

  return (
    <section className="post-list">
      <header className="posts-hero">
        <div className="posts-hero-head">
          <div className="posts-hero-kicker-row">
            <span className="posts-hero-kicker">
              <i className="fa-solid fa-tag" aria-hidden="true" />
              <span aria-hidden="true">·</span>
              <span>TAG</span>
              <span aria-hidden="true">·</span>
              <span>标签</span>
            </span>
            <p className="posts-hero-sub">
              <span className="posts-hero-count">
                #{tag?.name || ''} · {list.length} 篇文章
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="js-list-items">
        {list.length === 0 ? <p className="empty">这个标签下还没有文章</p> : null}
        {list.map((post: any, index: number) => {
          const { month, day } = datePartsInTimeZone(postDateInput(post), timeZone);
          return (
            <article className="post-compact-row" key={post.id}>
              <PostLink post={post} className="post-compact-link">
                <span className="post-compact-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="post-compact-title">
                  {post.is_top ? <span className="badge badge-top">置顶</span> : null}
                  {post.title}
                </span>
                <span className="post-compact-side" aria-hidden="true">
                  <span className="post-compact-date">
                    {month && day ? `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''}
                  </span>
                </span>
              </PostLink>
            </article>
          );
        })}
      </div>
    </section>
  );
}
