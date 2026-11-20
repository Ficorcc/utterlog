import CommentList from '@/components/blog/CommentList';

/**
 * 留言板：上游没有独立模板，这里复用文章页的评论区外壳
 * （.post-detail / .post-body-card / .comments），
 * 评论区本身用公共的 CommentList。
 */

/** 相对时间：留言板只关心「最近什么时候来过」 */
function relativeTime(timestamp: number) {
  const seconds = Number(timestamp || 0);
  if (!seconds) return '';
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return `${Math.floor(diff / 2592000)} 个月前`;
}

export default function GuestbookPage({
  postId,
  commentCount,
  commentAuthors,
  lastCommentAt,
}: {
  postId: number;
  commentCount: number;
  commentAuthors?: number;
  lastCommentAt?: number;
}) {
  const lastText = relativeTime(Number(lastCommentAt || 0));

  return (
    <article className="post-detail">
      <div className="post-body-card post-detail-card">
        <header className="post-hero-card">
          <div className="post-hero-title">
            <h1 className="post-title">留言板</h1>
          </div>
        </header>

        <div className="post-detail-content">
          <div className="archive-stats" aria-label="留言统计">
            <span>
              <strong>{Number(commentCount || 0)}</strong> 条留言
            </span>
            <span>
              <strong>{Number(commentAuthors || 0)}</strong> 位留言者
            </span>
            <span>
              <strong>{lastText || '还没有留言'}</strong> 最近留言
            </span>
          </div>

          <section className="comments" id="comments">
            <h3>
              <span className="comments-title-label">
                <i className="fa-regular fa-comment" aria-hidden="true" />
                <span>留言板</span>
              </span>
              <span className="comments-title-stats">
                <span>
                  <i className="fa-solid fa-people-group" aria-hidden="true" />
                  {Number(commentAuthors || 0)} 人参与
                </span>
                <span>
                  <i className="fa-regular fa-comment" aria-hidden="true" />
                  {Number(commentCount || 0)} 条评论
                </span>
              </span>
            </h3>
            <CommentList postId={postId} title="留言板" formPlacement="bottom" />
          </section>
        </div>
      </div>
    </article>
  );
}
