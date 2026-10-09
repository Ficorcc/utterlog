'use client';

/**
 * ShanYing · 文章页
 *
 * 对照原主题 single.php + content-single.php：
 *   头图 Hero（图 + 大标题 + 信息药丸 + 分享/相邻文章圆钮 + 底部卷边曲线）
 *   → 时效提醒 → AI 摘要 → 正文 → END 印章 → 版权块 → 标签
 *   → 悬浮阅读工具（目录 / 专注 / 打印）→ 再读一篇 → 评论区
 *
 * 与原主题的差异（能力边界，不是漏做）：
 *   - 「上一篇/下一篇」：Utterlog 的文章对象不带相邻文章，Hero 里补齐会多打一次
 *     接口；改为在文末用共享 PostNavigation 的「相关文章」承载同类需求。
 *   - 分享面板：微信走「复制链接」，微博/X 走 web-intent，逻辑与原主题一致。
 *   - 版权块的许可协议：Utterlog 没有 `article_license` 设置项，统一落到
 *     「保留所有权利」文案，不做假的许可选择器。
 */

import Link from '@/components/AppLink';
import AISummary from '@/components/blog/AISummary';
import CommentList from '@/components/blog/CommentList';
import FootprintFlags from '@/components/blog/FootprintFlags';
import PostContent from '@/components/blog/PostContent';
import PostNavigation from '@/components/blog/PostNavigation';
import VideoPostBody from '@/components/blog/VideoPostBody';
import { coverProps, randomCoverUrl } from '@/lib/blog-image';
import { useThemeContext } from '@/lib/theme-context';
import { formatDateInTimeZone, formatDateTimeInTimeZone, resolveSiteTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import ReadingTools from './ReadingTools';
import FloatingSidebar from './FloatingSidebar';
import { plainText, renderCatIcon } from './shanying-shared';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

function ShareCluster({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const href = () => (typeof window === 'undefined' ? '' : window.location.href);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(href());
      toast.success('链接已复制，去微信粘贴给朋友吧');
      setOpen(false);
    } catch {
      toast.error('复制失败，请手动复制地址栏');
    }
  };

  const webShare = (endpoint: string, params: Record<string, string>) => {
    const url = `${endpoint}?${new URLSearchParams({ ...params, url: href() }).toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="sy-share" ref={boxRef} data-open={open ? '1' : undefined}>
      <button
        type="button"
        className="sy-entry-round sy-share-toggle"
        aria-label={open ? '收起分享' : '展开分享'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sy-share-glyph"><i className="fa-regular fa-share-nodes" aria-hidden="true" /></span>
        <span className="sy-share-cross"><i className="fa-regular fa-xmark" aria-hidden="true" /></span>
      </button>

      <div className="sy-share-options" aria-hidden={!open}>
        <button type="button" className="sy-share-choice sy-share-wechat" onClick={copyLink} aria-label="分享到微信（复制链接）" title="微信">
          <i className="fa-brands fa-weixin" aria-hidden="true" />
        </button>
        <button type="button" className="sy-share-choice sy-share-weibo" onClick={() => webShare('https://service.weibo.com/share/share.php', { title })} aria-label="分享到微博" title="微博">
          <i className="fa-brands fa-weibo" aria-hidden="true" />
        </button>
        <button type="button" className="sy-share-choice sy-share-x" onClick={() => webShare('https://twitter.com/intent/tweet', { text: title })} aria-label="分享到 X" title="X">
          <i className="fa-brands fa-x-twitter" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function PostPage({ post, options }: { post: any; options?: Record<string, string> }) {
  const ctx = useThemeContext();
  const mergedOptions = options || ctx.options || {};
  const timeZone = ctx.timeZone || resolveSiteTimeZone(mergedOptions);

  const cover = post?.cover_url || randomCoverUrl(post?.id, mergedOptions);
  const category = post?.categories?.[0];
  const isVideo = post?.type === 'video';
  const authorName = post?.author?.nickname || post?.author?.username || ctx.owner.nickname || ctx.site.title || 'Utterlog';
  const authorAvatar = post?.author?.avatar || ctx.owner.avatar || '';
  const wordCount = Number(post?.word_count || 0);
  const readMinutes = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 400)) : null;
  const displayDate = postDateInput(post);
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  };
  const published = formatDateTimeInTimeZone(displayDate, 'zh-CN', dateTimeOptions, timeZone);
  const shortDate = formatDateInTimeZone(displayDate, 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }, timeZone).replace(/\//g, '.');
  const updatedRaw = post?.updated_at;
  const updated = updatedRaw ? formatDateTimeInTimeZone(updatedRaw, 'zh-CN', dateTimeOptions, timeZone) : '';
  const excerpt = plainText(post?.excerpt || post?.ai_summary).slice(0, 220);

  // 时效提醒：与原主题一致，只在「最后一次更新距今超过一年」时出现。
  const ageDays = (() => {
    const value = updatedRaw || displayDate;
    if (!value) return 0;
    const ms = typeof value === 'number' ? (value < 1e12 ? value * 1000 : value) : new Date(String(value)).getTime();
    if (!Number.isFinite(ms)) return 0;
    return Math.floor((Date.now() - ms) / 86400000);
  })();
  const showAge = ageDays >= 365;

  return (
    <>
      <article className="sy-article" data-type={post?.type || 'post'} id="sy-article">
        <header className={`sy-entry-hero${cover && !isVideo ? ' sy-entry-hero--image' : ''}`}>
          {cover && !isVideo && (
            <div className="sy-entry-hero-media" aria-hidden="true">
              <img {...coverProps({ src: cover, alt: '', priority: true })} />
            </div>
          )}

          <div className="sy-entry-hero-copy">
            <h1>{post?.title || '无标题'}</h1>

            <div className="sy-entry-tools">
              <div className="sy-entry-facts">
                <span className="sy-entry-pill" tabIndex={0}>
                  <span className="sy-entry-pill-label">文章作者</span>
                  <span className="sy-entry-pill-value">
                    <span className="sy-entry-avatar">
                      {authorAvatar ? <img src={authorAvatar} alt="" /> : authorName.slice(0, 1)}
                    </span>
                    <span className="sy-entry-author">{authorName}</span>
                  </span>
                </span>

                <span className="sy-entry-pill" tabIndex={0}>
                  <span className="sy-entry-pill-label">文章发布日期</span>
                  <span className="sy-entry-pill-value">
                    <i className="fa-regular fa-calendar-days" aria-hidden="true" />
                    <span>{published}</span>
                  </span>
                </span>

                <span className="sy-entry-pill" tabIndex={0}>
                  <span className="sy-entry-pill-label">热度</span>
                  <span className="sy-entry-pill-value">
                    <i className="fa-regular fa-fire" aria-hidden="true" />
                    <span>{Number(post?.view_count || 0).toLocaleString()}</span>
                  </span>
                </span>

                {wordCount > 0 && (
                  <span className="sy-entry-pill" tabIndex={0}>
                    <span className="sy-entry-pill-label">本文共计</span>
                    <span className="sy-entry-pill-value">
                      <i className="fa-regular fa-file-lines" aria-hidden="true" />
                      <span>{wordCount.toLocaleString()} 字</span>
                    </span>
                  </span>
                )}

                {readMinutes && (
                  <span className="sy-entry-pill" tabIndex={0}>
                    <span className="sy-entry-pill-label">预计阅读</span>
                    <span className="sy-entry-pill-value">
                      <i className="fa-regular fa-clock" aria-hidden="true" />
                      <span>{readMinutes} 分钟</span>
                    </span>
                  </span>
                )}
              </div>

              <nav className="sy-entry-actions" aria-label="分享与阅读工具">
                <ShareCluster title={post?.title || ''} />
                {category && (
                  <Link prefetch={false} href={`/categories/${category.slug}`} className="sy-entry-round" title={category.name} aria-label={`进入分类 ${category.name}`}>
                    {renderCatIcon(category.icon, 17)}
                  </Link>
                )}
              </nav>
            </div>
          </div>

          {cover && !isVideo && (
            <svg className="sy-entry-curve" viewBox="0 0 1000 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d="M0 0 C180 24 820 24 1000 0 V24 H0 Z" />
            </svg>
          )}
          <FootprintFlags countries={post?.footprint_countries} />
        </header>

        <div className="sy-entry-body">
          {showAge && (
            <aside className="sy-article-age" aria-label="文章时效提醒">
              <strong>这篇文章已有 {Math.floor(ageDays / 365)} 年未更新</strong>
              <p>
                最后更新于 {updated || shortDate}。文中涉及的信息、操作步骤或观点可能已有变化，请结合最新情况参考。
              </p>
            </aside>
          )}

          <div id="sy-article-text" className="sy-article-text">
            {isVideo ? (
              <>
                <VideoPostBody post={post} />
                {post?.content ? <PostContent content={post.content} /> : null}
              </>
            ) : (
              <>
                <AISummary postId={post?.id} aiSummary={post?.ai_summary} excerpt={post?.excerpt} />
                <PostContent content={post?.content || ''} />
              </>
            )}
          </div>
        </div>

        <footer className="sy-article-footer">
          <div className="sy-article-end" aria-label="正文结束">
            <span>END</span>
          </div>

          <section className="sy-article-copyright" aria-label="文章署名与版权">
            <h2>
              <i className="fa-brands fa-creative-commons" aria-hidden="true" />
              文章信息与版权
            </h2>
            <dl>
              <div>
                <dt>本文作者</dt>
                <dd>{authorName}</dd>
              </div>
              <div>
                <dt>文章分类</dt>
                <dd>
                  {post?.categories?.length
                    ? post.categories.map((item: any, index: number) => (
                        <span key={item.id}>
                          {index > 0 && <span aria-hidden="true"> · </span>}
                          <Link prefetch={false} href={`/categories/${item.slug}`}>{item.name}</Link>
                        </span>
                      ))
                    : '未分类'}
                </dd>
              </div>
              <div>
                <dt>首次发布</dt>
                <dd>{published}</dd>
              </div>
              {updated && (
                <div>
                  <dt>最后更新</dt>
                  <dd>{updated}</dd>
                </div>
              )}
            </dl>

            <div className="sy-copyright-source">
              <span>原文</span>
              <button
                type="button"
                className="sy-copyright-link"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success('原文链接已复制');
                  } catch {
                    toast.error('复制失败，请手动复制');
                  }
                }}
              >
                {post?.title}
              </button>
            </div>

            {post?.tags?.length > 0 && (
              <nav className="sy-copyright-keywords" aria-label="文章关键词">
                <span>关键词</span>
                {post.tags.map((tag: any) => (
                  <Link prefetch={false} key={tag.id || tag.slug} href={`/tags/${tag.slug}`}>#{tag.name}</Link>
                ))}
              </nav>
            )}

            <p className="sy-copyright-rule">
              © {new Date().getFullYear()} {authorName} · 保留所有权利。除法律允许外，转载须获授权，并保留署名、标题、原文链接及版权声明。
              <span>仅适用于作者享有权利的内容，另有声明及第三方素材依原授权。</span>
            </p>
          </section>
        </footer>
      </article>

      <ReadingTools content={post?.content || ''} />

      <FloatingSidebar content={post?.content || ''} postId={post?.id} />

      <section className="sy-related" aria-label="继续阅读">
        <header className="sy-related-heading">
          <div>
            <p className="sy-kicker">KEEP READING</p>
            <h2>再读一篇</h2>
          </div>
        </header>
        <PostNavigation postId={post?.id} coverUrl={cover} pageSize={6} />
      </section>

      <section className="sy-comments" aria-label="评论">
        <header className="sy-comments-heading">
          <p className="sy-kicker">DISCUSSION</p>
          <h2>评论 · {Number(post?.comment_count || 0).toLocaleString()}</h2>
        </header>
        <CommentList postId={post?.id} title={post?.title} />
      </section>

      {excerpt && <p className="sy-sr-only">{excerpt}</p>}
    </>
  );
}
