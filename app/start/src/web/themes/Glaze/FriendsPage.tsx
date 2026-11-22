'use client';

import { useThemeContext } from '@/lib/theme-context';
import { dateLabel } from './utils';

/**
 * 朋友圈页：把好友站点的最新动态按好友分组铺开。
 *
 *   header.page-heading.glaze-panel
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *   ul.archive-stats[role=list]            好友数 / 有动态的站点数
 *   article.friend-card.glaze-panel
 *     span.collection-site-icon.squircle
 *     span.friend-name（链接到好友站点）
 *     span.friend-description
 *     ul.friend-posts[role=list] > li > a（标题 + time）
 */

/** 站内同源链接直接跳转，其余外链统一走外链确认页 */
function externalHref(url: string, siteUrl: string): string {
  const raw = String(url || '').trim();
  if (!raw) return '/';
  if (raw.startsWith('/') || raw.startsWith('#')) return raw;
  try {
    const target = new URL(raw);
    if (siteUrl) {
      try {
        if (target.hostname === new URL(siteUrl).hostname) return raw;
      } catch {
        /* 站点地址不可解析时按外链处理 */
      }
    }
  } catch {
    return raw;
  }
  return `/go?url=${encodeURIComponent(raw)}`;
}

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

export default function FriendsPage({
  friends = [],
  total,
  withPosts,
}: {
  friends?: any[];
  total?: number;
  withPosts?: number;
}) {
  const { site, timeZone } = useThemeContext();
  const list: any[] = Array.isArray(friends) ? friends : [];
  const siteUrl = String(site?.url || '');

  const friendTotal = total ?? list.length;
  const activeCount = withPosts ?? list.filter((friend) => (friend?.posts || []).length > 0).length;

  return (
    <div className="glaze-friends">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle" aria-hidden="true">
            <span className="glaze-icon" data-glaze-icon="misc" />
          </span>
          <span>朋友圈</span>
        </h1>
      </header>

      <ul className="archive-stats" role="list" aria-label="朋友圈概览">
        <li>
          <strong>{friendTotal}</strong> 个好友
        </li>
        <li>
          <strong>{activeCount}</strong> 个站点有动态
        </li>
      </ul>

      {list.length === 0 ? (
        <div className="empty-state glaze-panel">
          <p>还没有添加友情链接</p>
        </div>
      ) : (
        <div className="glaze-friend-list">
          {list.map((friend: any, index: number) => {
            const url = String(friend?.url || '');
            const avatar = String(friend?.avatar || '').trim();
            const posts = Array.isArray(friend?.posts) ? friend.posts : [];
            return (
              <article className="friend-card glaze-panel" key={friend?.id ?? index}>
                <div className="friend-card-head">
                  <span className={`collection-site-icon squircle${avatar ? ' has-site-image' : ''}`}>
                    <span className="glaze-icon" data-glaze-icon="friends" aria-hidden="true" />
                    {avatar ? (
                      <img className="collection-site-image" src={avatar} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </span>
                  <a
                    className="friend-name"
                    href={externalHref(url, siteUrl)}
                    target="_blank"
                    rel="external noopener noreferrer"
                  >
                    {String(friend?.name || url || '未命名站点')}
                  </a>
                  {friend?.group ? <span className="friend-card-group">{String(friend.group)}</span> : null}
                </div>
                {friend?.desc ? <span className="friend-description">{String(friend.desc)}</span> : null}

                {posts.length ? (
                  <ul className="friend-posts" role="list">
                    {posts.map((post: any, postIndex: number) => (
                      <li key={`${friend?.id ?? index}-${post?.link || post?.title || postIndex}`}>
                        <a
                          className="friend-post"
                          href={externalHref(String(post?.link || ''), siteUrl)}
                          target="_blank"
                          rel="external noopener noreferrer"
                        >
                          <span className="friend-post-title">{String(post?.title || '')}</span>
                          <time className="friend-post-time" dateTime={isoTime(post?.pubDate)}>
                            {dateLabel(post?.pubDate, timeZone)}
                          </time>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
