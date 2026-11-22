'use client';

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { shortDateLabel, stripHtml } from './utils';

/**
 * 首页侧轨。
 *
 * 上游的侧轨有四种类型（links / comments / subscriptions / talks），左右各一列。
 * 这里按站点现有数据落两条：左轨「说说」、右轨「最新评论」。
 *
 * DOM（上游 template-parts/home-rails.php）：
 *   div.home-rails
 *     └─ aside.home-rail.home-rail--{side}[data-glaze-home-rail]
 *         ├─ h2.home-rail-title
 *         └─ ol.home-rail-list
 *             └─ li.home-rail-item[data-glaze-rail-card]
 *                 └─ a.home-rail-card.home-rail-card--{note|comment}.glaze-panel
 */
export default function HomeRails({
  comments = [],
  moments = [],
}: {
  comments?: any[];
  moments?: any[];
}) {
  const notes = (moments || []).slice(0, 6);
  const recentComments = (comments || []).slice(0, 6);

  if (!notes.length && !recentComments.length) return null;

  return (
    <div className="home-rails">
      {notes.length ? (
        <aside className="home-rail home-rail--left" data-glaze-home-rail="left" aria-labelledby="home-rail-left">
          <h2 className="home-rail-title" id="home-rail-left">
            <Link href="/moments" prefetch={false}>说说 <span aria-hidden="true">›</span></Link>
          </h2>
          <ol className="home-rail-list" id="home-rail-list-left">
            {notes.map((moment) => (
              <li className="home-rail-item" data-glaze-rail-card key={moment?.id}>
                <a className="home-rail-card home-rail-card--note glaze-panel" href={`/moments#note-${moment?.id}`}>
                  <span className="home-rail-meta">
                    <span className="home-rail-avatar" aria-hidden="true">
                      <span className="glaze-icon" data-glaze-icon="talks" />
                    </span>
                    <span className="home-rail-author">说说</span>
                    <time dateTime={String(moment?.created_at || '')}>{shortDateLabel(moment?.created_at)}</time>
                  </span>
                  <span className="home-rail-note-body">
                    <span className="home-rail-note-text">{stripHtml(String(moment?.content || '')).slice(0, 80)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </aside>
      ) : null}

      {recentComments.length ? (
        <aside className="home-rail home-rail--right" data-glaze-home-rail="right" aria-labelledby="home-rail-right">
          <h2 className="home-rail-title" id="home-rail-right">
            最新评论
          </h2>
          <ol className="home-rail-list" id="home-rail-list-right">
            {recentComments.map((comment) => (
              <li className="home-rail-item" data-glaze-rail-card key={comment?.id}>
                <PostLink
                  className="home-rail-card home-rail-card--comment glaze-panel"
                  post={{
                    id: comment?.post_id,
                    slug: comment?.post_slug,
                    published_at: comment?.post_published_at,
                    created_at: comment?.post_created_at,
                  }}
                  hash={`comment-${comment?.id}`}
                >
                  <span className="home-rail-meta">
                    <span className="home-rail-avatar" aria-hidden="true">
                      {comment?.avatar_url ? (
                        <img src={comment.avatar_url} alt="" width="20" height="20" loading="lazy" />
                      ) : (
                        <span>{String(comment?.author || '访客').slice(0, 1)}</span>
                      )}
                    </span>
                    <span className="home-rail-author">{comment?.author || '访客'}</span>
                    <time dateTime={String(comment?.created_at || '')}>{shortDateLabel(comment?.created_at)}</time>
                  </span>
                  <span className="home-rail-headline">{comment?.post_title || '文章评论'}</span>
                  <span className="home-rail-excerpt">{stripHtml(String(comment?.content || '')).slice(0, 60)}</span>
                </PostLink>
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
    </div>
  );
}
