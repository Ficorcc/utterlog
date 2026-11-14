'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { IconArrowRight, IconLink, IconMail, IconRss, IconSend, IconUser } from './Icons';
import { formatDate, toDate } from './utils';

/**
 * 关于页：复刻原主题 about.php 的结构。
 *
 * 原版（Typecho）这一页是站长手写的独立模板：
 *   .abt-head  → 头像 + 站点简介 + 建站信息 + 社交按钮 + 四格统计
 *   .abt-sec   → 「建站历程」时间轴 + 「最近更新」文章列表
 *   .abt-cta   → 去留言板的引导条
 *
 * 数据来源换成 Utterlog：
 *   - 站点简介 / 名称 / logo → theme-context 的 site、owner
 *   - 文章数、评论数、标签数、运行天数 → theme-context 的 archiveStats、tags
 *   - 「建站历程」→ 后台「关于页」配置里的 Markdown，空时用结构化更新记录
 *   - 「最近更新」→ 服务端随页面一起下发的最新三篇文章
 */

interface RecentPost {
  id: number;
  slug?: string;
  title?: string;
  published_at?: string | number | null;
  created_at?: string | number;
}

interface AboutProps {
  recentPosts?: RecentPost[];
}

type AboutUpdate = { date?: string; type?: string; title?: string; description?: string };

function parseAboutConfig(raw: unknown) {
  if (!raw) return {} as { updates?: AboutUpdate[] };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? (parsed as { updates?: AboutUpdate[] }) : {};
  } catch {
    return {} as { updates?: AboutUpdate[] };
  }
}

function pick(source: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = String(source?.[key] || '').trim();
    if (value) return value;
  }
  return '';
}

export default function AboutPage({ recentPosts = [] }: AboutProps) {
  const { site, owner, options, archiveStats, tags } = useThemeContext();

  const markdown = String(options?.page_about_markdown || '').trim();
  const updates = useMemo(() => {
    const config = parseAboutConfig(options?.page_about_config);
    const list = Array.isArray(config.updates) ? config.updates.filter((item) => item?.title?.trim()) : [];
    return list.slice().sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));
  }, [options?.page_about_config]);

  /** 建站日期：后台可配优先，否则按运行天数倒推。 */
  const startDate = useMemo(() => {
    const configured = toDate(options?.robes_site_start || '');
    if (configured) return configured;
    const days = Number(archiveStats?.days || 0);
    if (days > 0) return new Date(Date.now() - (days - 1) * 86400000);
    return null;
  }, [options?.robes_site_start, archiveStats?.days]);

  const recent = Array.isArray(recentPosts) ? recentPosts : [];
  const lastUpdated = recent.length ? toDate(recent[0].published_at || recent[0].created_at) : null;

  const socials = useMemo(() => {
    const source: Record<string, string> = { ...(options || {}), ...(owner?.socials || {}) };
    const items: { label: string; href: string; icon: React.ReactNode }[] = [];

    const add = (label: string, raw: string, prefix: string, icon: React.ReactNode) => {
      const value = String(raw || '').trim();
      if (!value) return;
      const href = /^(https?:|mailto:)/i.test(value) ? value : `${prefix}${value}`;
      items.push({ label, href, icon });
    };

    add('GitHub', pick(source, ['social_github', 'github']), 'https://github.com/', <IconLink size={13} />);
    add('Twitter', pick(source, ['social_twitter', 'twitter', 'x']), 'https://x.com/', <IconLink size={13} />);
    add('微博', pick(source, ['social_weibo', 'weibo']), 'https://weibo.com/', <IconLink size={13} />);
    add('Telegram', pick(source, ['social_telegram', 'telegram']), 'https://t.me/', <IconSend size={13} />);
    add('邮箱', pick(source, ['social_email', 'email']) || String(owner?.email || ''), 'mailto:', <IconMail size={13} />);
    items.push({ label: 'RSS', href: '/feed/', icon: <IconRss size={13} /> });

    return items;
  }, [options, owner?.socials, owner?.email]);

  const avatar = site?.logo || owner?.avatar || '';
  const title = site?.description || owner?.bio || '关于这个站点';

  return (
    <article className="article standalone-page">
      <div className="abt">
        <header className="abt-head">
          <span className="abt-deco" aria-hidden="true">
            <IconUser size={104} />
          </span>

          <div className="abt-profile">
            <div className="abt-avatar">
              {avatar ? <img src={avatar} alt={site?.title || ''} /> : (site?.title || 'R').slice(0, 1)}
            </div>
            <div className="abt-intro">
              <span className="abt-eyebrow">
                <IconUser size={13} />
                About · 关于
              </span>
              <h1 className="abt-title">{title}</h1>
              <p className="abt-meta">
                <span>{site?.title || ''}</span>
                <i />
                <span>建于 {startDate ? formatDate(startDate, 'yyyy.MM.dd') : '—'}</span>
                <i />
                <span>运行 {Number(archiveStats?.days || 0)} 天</span>
              </p>
            </div>
          </div>

          <div className="abt-links">
            {socials.map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" title={item.label}>
                {item.icon}
                {item.label}
              </a>
            ))}
          </div>

          <div className="abt-stats">
            <div className="abt-stat">
              <b>{Number(archiveStats?.post_count || 0)}</b>
              <span>篇文章</span>
            </div>
            <div className="abt-stat">
              <b>{Number(archiveStats?.comment_count || 0)}</b>
              <span>条评论</span>
            </div>
            <div className="abt-stat">
              <b>{tags?.length || 0}</b>
              <span>个标签</span>
            </div>
            <div className="abt-stat">
              <b>{lastUpdated ? formatDate(lastUpdated, 'yyyy.MM.dd') : '—'}</b>
              <span>最近更新</span>
            </div>
          </div>
        </header>

        {markdown || updates.length ? (
          <section className="abt-sec">
            <div className="abt-sec-head">
              <h2>建站历程</h2>
              <span>
                {startDate ? formatDate(startDate, 'yyyy') : ''} — {new Date().getFullYear()}
              </span>
            </div>
            <div className="abt-story">
              {markdown ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node: _node, ...props }) => (
                      <a
                        {...props}
                        target={props.href?.startsWith('http') ? '_blank' : undefined}
                        rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      />
                    ),
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              ) : (
                <ul>
                  {updates.map((item, index) => (
                    <li key={`${item.date || ''}-${item.title}-${index}`}>
                      <time>{item.date || ''}</time>
                      <strong>{item.title}</strong>
                      {item.description ? <p>{item.description}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {recent.length ? (
          <section className="abt-sec">
            <div className="abt-sec-head">
              <h2>最近更新</h2>
              <a className="abt-more" href="/">
                全部文章
                <IconArrowRight size={13} />
              </a>
            </div>
            <ul className="abt-posts">
              {recent.map((post) => (
                <li key={post.id}>
                  <PostLink post={post}>
                    <time>{formatDate(post.published_at || post.created_at, 'MM.dd')}</time>
                    <span className="abt-post-title">{post.title}</span>
                    <IconArrowRight size={12} />
                  </PostLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="abt-cta">
          <span>想聊点什么，或者只是路过打个招呼。</span>
          <a href="/guestbook">
            去留言板
            <IconArrowRight size={13} />
          </a>
        </div>
      </div>
    </article>
  );
}
