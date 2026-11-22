'use client';

import { useThemeContext } from '@/lib/theme-context';

/**
 * 友情链接页。
 *
 *   header.page-heading.glaze-panel
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *   ul.friend-list[role=list]
 *     li > a.friend-link[rel=external][target=_blank]
 *       span.collection-site-icon.squircle > span.glaze-icon / img.collection-site-image
 *       span.friend-name
 *       span.friend-description
 */

interface GlazeLink {
  id?: number;
  name?: string;
  url?: string;
  description?: string;
  logo?: string;
  avatar?: string;
  group_name?: string;
  rss_url?: string;
}

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
    /* 不是完整 URL，当作站内路径 */
    return raw;
  }
  return `/go?url=${encodeURIComponent(raw)}`;
}

/**
 * initialOptions 是站点 options 表的扁平字典，本页当前没有需要读取的
 * 主题私有键（glaze_ 前缀），保留参数以符合槽位 props 契约。
 */
export default function LinksPage({
  initialLinks = [],
}: {
  initialLinks?: any[];
  initialOptions?: Record<string, string>;
}) {
  const { site } = useThemeContext();
  const links: GlazeLink[] = Array.isArray(initialLinks) ? initialLinks : [];
  const siteUrl = String(site?.url || '');

  return (
    <div className="glaze-links">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle" aria-hidden="true">
            <span className="glaze-icon" data-glaze-icon="links" />
          </span>
          <span>友情链接</span>
        </h1>
        <p className="archive-description">共 {links.length} 个站点</p>
      </header>

      {links.length === 0 ? (
        <div className="empty-state glaze-panel">
          <p>还没有添加友情链接</p>
        </div>
      ) : (
        <ul className="friend-list" role="list">
          {links.map((link, index) => {
            const url = String(link?.url || '');
            const logo = String(link?.logo || link?.avatar || '').trim();
            const description = String(link?.description || '').trim();
            return (
              <li key={link?.id ?? index}>
                <a
                  className="friend-link"
                  href={externalHref(url, siteUrl)}
                  target="_blank"
                  rel="external noopener noreferrer"
                >
                  <span className={`collection-site-icon squircle${logo ? ' has-site-image' : ''}`}>
                    <span className="glaze-icon" data-glaze-icon="links" aria-hidden="true" />
                    {logo ? (
                      <img className="collection-site-image" src={logo} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </span>
                  <span className="friend-name">{String(link?.name || url || '未命名站点')}</span>
                  {description ? <span className="friend-description">{description}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
