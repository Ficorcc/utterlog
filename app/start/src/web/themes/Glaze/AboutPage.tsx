'use client';

import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { dateLabel, excerptOf } from './utils';

/**
 * 关于页。
 *
 *   header.page-heading.glaze-panel
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *   section.glaze-about-intro.glaze-panel      站点介绍 + 站长
 *   section.glaze-about-recent
 *     div.post-list > article.post-card.glaze-panel
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

export default function AboutPage({ recentPosts = [] }: { recentPosts?: any[] }) {
  const { site, owner, timeZone } = useThemeContext();
  const recent = (Array.isArray(recentPosts) ? recentPosts : []).slice(0, 6);

  const siteTitle = String(site?.title || '').trim();
  const intro = String(site?.description || site?.subtitle || '').trim();
  const ownerName = String(owner?.nickname || siteTitle || '站长').trim();
  const bio = String(owner?.bio || '').trim();
  const avatar = String(owner?.avatar || site?.logo || '').trim();

  return (
    <div className="glaze-about">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle" aria-hidden="true">
            <span className="glaze-icon" data-glaze-icon="about" />
          </span>
          <span>关于</span>
        </h1>
        {intro ? <p className="archive-description">{intro}</p> : null}
      </header>

      <section className="glaze-about-intro glaze-panel">
        {avatar ? (
          <img className="glaze-about-avatar" src={avatar} alt={ownerName} loading="lazy" decoding="async" />
        ) : null}
        <div className="glaze-about-copy">
          {siteTitle ? <h2 className="glaze-about-site-title">{siteTitle}</h2> : null}
          {intro ? <p className="glaze-about-desc">{intro}</p> : null}
          <p className="glaze-about-owner">
            <span className="glaze-about-owner-name">{ownerName}</span>
            {bio ? <span className="glaze-about-owner-bio">{bio}</span> : null}
          </p>
          {!intro && !bio ? <p className="glaze-about-desc">还没有填写站点介绍。</p> : null}
        </div>
      </section>

      <section className="glaze-about-recent">
        <h2 className="glaze-about-section-title">最近文章</h2>
        {recent.length === 0 ? (
          <div className="empty-state glaze-panel">
            <p>还没有发布文章</p>
          </div>
        ) : (
          <div className="post-list">
            {recent.map((post: any) => {
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
                          {dateLabel(published, timeZone)}
                        </time>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
