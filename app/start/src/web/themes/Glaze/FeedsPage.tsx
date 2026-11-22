'use client';

import { useMemo } from 'react';
import { useThemeContext } from '@/lib/theme-context';
import { dateLabel, stripHtml } from './utils';

/**
 * 订阅页：把订阅源抓回来的最新条目按时间倒序铺开。
 *
 *   header.page-heading.glaze-panel
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *   div.subscription-list
 *     article.subscription-item
 *       a.subscription-link.squircle[rel=external]
 *         span.collection-site-icon.squircle
 *         div.subscription-copy
 *           div.subscription-meta > span（源站名）+ time
 *           h2
 *           p（摘要）
 *         span.collection-external-arrow
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

export default function FeedsPage({
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

  const sourceTotal = total ?? list.length;
  const activeCount = withPosts ?? list.filter((friend) => (friend?.posts || []).length > 0).length;

  const items = useMemo(() => {
    const rows: { friend: any; post: any }[] = [];
    for (const friend of list) {
      const posts = Array.isArray(friend?.posts) ? friend.posts : [];
      for (const post of posts) rows.push({ friend, post });
    }
    return rows.sort((a, b) => Number(b.post?.pubDate || 0) - Number(a.post?.pubDate || 0));
  }, [list]);

  return (
    <div className="glaze-feeds">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle" aria-hidden="true">
            <span className="glaze-icon" data-glaze-icon="feeds" />
          </span>
          <span>订阅</span>
        </h1>
        <p className="archive-description">
          {sourceTotal} 个订阅源 · {activeCount} 个有更新
        </p>
      </header>

      {items.length === 0 ? (
        <div className="empty-state glaze-panel">
          <p>还没有订阅内容，在后台友链管理里添加 RSS 地址即可</p>
        </div>
      ) : (
        <div className="subscription-list">
          {items.map(({ friend, post }, index) => {
            const avatar = String(friend?.avatar || '').trim();
            const summary = stripHtml(String(post?.description || '')).slice(0, 120);
            return (
              <article className="subscription-item" key={`${friend?.id ?? index}-${post?.link || post?.title || index}`}>
                <a
                  className="subscription-link squircle"
                  href={externalHref(String(post?.link || ''), siteUrl)}
                  target="_blank"
                  rel="external noopener noreferrer"
                >
                  <span className={`collection-site-icon squircle${avatar ? ' has-site-image' : ''}`}>
                    <span className="glaze-icon" data-glaze-icon="feeds" aria-hidden="true" />
                    {avatar ? (
                      <img className="collection-site-image" src={avatar} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </span>
                  <div className="subscription-copy">
                    <div className="subscription-meta">
                      <span>{String(friend?.name || '')}</span>
                      <time dateTime={isoTime(post?.pubDate)}>{dateLabel(post?.pubDate, timeZone)}</time>
                    </div>
                    <h2>{String(post?.title || '')}</h2>
                    {summary ? <p>{summary}</p> : null}
                  </div>
                  <span className="collection-external-arrow" aria-hidden="true">
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                  </span>
                </a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
