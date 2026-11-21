'use client';

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import PostContent from './PostContent';
import { useThemeContext } from '@/lib/theme-context';
import { datePartsInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

/**
 * 关于页：借用动态页（pages/activity.php）的 .activity-page / .activity-hero /
 * .activity-panel 结构，配合归档页的统计样式和紧凑文章行，
 * 做成与朋友圈页、订阅页一致的面板观感。
 *
 *   .activity-page
 *     .activity-hero            标题标记 + 一句介绍 + 博主头像
 *     .activity-panel           关于本站（简介 + Markdown 自述）
 *     .activity-panel           站点统计（.archive-stats）
 *     .activity-panel           社交链接（.about-socials）
 *     .activity-panel           最近更新（.post-compact-row）
 *     .activity-panel           留言板入口
 */

/** 常见社交平台对应的图标与展示名，未收录的用通用链接图标 */
const SOCIAL_ICONS: Record<string, { icon: string; label: string }> = {
  github: { icon: 'fa-brands fa-github', label: 'GitHub' },
  twitter: { icon: 'fa-brands fa-x-twitter', label: 'Twitter' },
  x: { icon: 'fa-brands fa-x-twitter', label: 'X' },
  weibo: { icon: 'fa-brands fa-weibo', label: '微博' },
  telegram: { icon: 'fa-brands fa-telegram', label: 'Telegram' },
  bilibili: { icon: 'fa-brands fa-bilibili', label: '哔哩哔哩' },
  zhihu: { icon: 'fa-brands fa-zhihu', label: '知乎' },
  qq: { icon: 'fa-brands fa-qq', label: 'QQ' },
  email: { icon: 'fa-regular fa-envelope', label: '邮箱' },
  mail: { icon: 'fa-regular fa-envelope', label: '邮箱' },
  rss: { icon: 'fa-solid fa-rss', label: 'RSS' },
};

/** 社交地址：邮箱补 mailto:，裸域名补 https: */
function socialHref(key: string, value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|mailto:|\/|#)/i.test(raw)) return raw;
  if (key.includes('email') || key.includes('mail') || raw.includes('@')) return `mailto:${raw}`;
  return `https://${raw}`;
}

export default function AboutPage({ recentPosts = [] }: { recentPosts?: any[] }) {
  const { site, owner, options, archiveStats, tags, timeZone } = useThemeContext();
  const recent = Array.isArray(recentPosts) ? recentPosts.slice(0, 6) : [];
  const markdown = String(options?.page_about_markdown || '').trim();
  const intro = String(site?.description || site?.subtitle || '').trim();
  const bio = String(owner?.bio || '').trim();
  const avatar = String(owner?.avatar || site?.logo || '').trim();

  const socials = Object.entries(owner?.socials || {})
    .map(([key, value]) => ({ key, href: socialHref(key, String(value || '')) }))
    .filter((item) => item.href);

  const headline = [
    { value: Number(archiveStats?.post_count || 0), label: '篇文章' },
    { value: Number(archiveStats?.comment_count || 0), label: '条评论' },
    { value: Array.isArray(tags) ? tags.length : 0, label: '个标签' },
    { value: Number(archiveStats?.days || 0), label: '天' },
  ];

  return (
    <section className="activity-page">
      <header className="activity-hero">
        <div className="activity-hero-main about-hero-main">
          <div className="about-hero-text">
            <div className="activity-title-mark">
              <span aria-hidden="true" />
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <b>ABOUT</b>
              <em>关于</em>
            </div>
            <p>{intro || bio || '关于这个站点的一切，都写在下面这几块面板里。'}</p>
          </div>
          {avatar ? (
            <div className="about-hero-avatar">
              <img src={avatar} alt={owner?.nickname || site?.title || '站长'} loading="lazy" decoding="async" />
            </div>
          ) : null}
        </div>
      </header>

      <section className="activity-panel about-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-solid fa-compass" aria-hidden="true" /> 关于本站
          </h3>
          <span>{site?.title || 'Utterlog'}</span>
        </div>
        <div className="about-intro">
          {intro ? <p className="about-intro-lead">{intro}</p> : null}
          {bio && bio !== intro ? <p className="about-intro-bio">{bio}</p> : null}
          {markdown ? (
            <div className="about-markdown">
              <PostContent content={markdown} />
            </div>
          ) : null}
          {!intro && !bio && !markdown ? <p className="about-empty">还没有填写站点介绍。</p> : null}
        </div>
      </section>

      <section className="activity-panel about-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-solid fa-chart-simple" aria-hidden="true" /> 站点统计
          </h3>
          <span>已经运行 {Number(archiveStats?.days || 0)} 天</span>
        </div>
        <div className="archive-stats about-stats" aria-label="站点统计">
          {headline.map((item) => (
            <span key={item.label}>
              <strong>{item.value.toLocaleString()}</strong> {item.label}
            </span>
          ))}
        </div>
      </section>

      <section className="activity-panel about-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-solid fa-share-nodes" aria-hidden="true" /> 找到我
          </h3>
          <span>{owner?.nickname || site?.title || '联系站长'}</span>
        </div>
        {socials.length ? (
          <div className="about-socials">
            {socials.map((item) => {
              const meta = SOCIAL_ICONS[item.key.toLowerCase()] || { icon: 'fa-solid fa-link', label: item.key };
              const external = /^https?:/i.test(item.href);
              return (
                <a
                  key={item.key}
                  className="about-social"
                  href={item.href}
                  title={meta.label}
                  aria-label={meta.label}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'nofollow noopener' : undefined}
                >
                  <i className={meta.icon} aria-hidden="true" />
                  <span>{meta.label}</span>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="about-empty">还没有留下联系方式。</p>
        )}
      </section>

      <section className="activity-panel about-panel">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-regular fa-file-lines" aria-hidden="true" /> 最近更新
          </h3>
          <Link prefetch={false} href="/archives">
            全部归档
          </Link>
        </div>
        {recent.length === 0 ? <p className="about-empty">还没有文章</p> : null}
        <div className="about-post-list">
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
        </div>
      </section>

      <section className="activity-panel about-panel about-panel-last">
        <div className="activity-panel-head">
          <h3>
            <i className="fa-regular fa-message-lines" aria-hidden="true" /> 留言板
          </h3>
          <span>路过留个言</span>
        </div>
        <div className="about-guestbook">
          <p>有什么想聊的，或者只是路过打个招呼，都可以写在这里。</p>
          <Link prefetch={false} href="/guestbook" className="about-guestbook-btn">
            <i className="fa-regular fa-message-lines" aria-hidden="true" /> 去留言板打个招呼
          </Link>
        </div>
      </section>
    </section>
  );
}
