'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import CommentSection from './CommentSection';
import {
  categoriesOf,
  categoryHref,
  coverOf,
  dateTimeLabel,
  stripHtml,
  tagsOf,
  tagHref,
} from './utils';

interface NavPost {
  id: number;
  title: string;
  slug: string;
  published_at?: string | number | null;
  created_at?: number;
}

interface NavigationData {
  prev?: NavPost | null;
  next?: NavPost | null;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

/** 给正文里的 h2 / h3 补 id（上游靠锚点做目录，编辑器不一定写 id） */
function withHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const used = new Set<string>();
  const slugify = (text: string) => {
    const base = text
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return base || 'section';
  };
  const next = String(html || '').replace(/<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (match, tag: string, attrs: string, inner: string) => {
    const text = stripHtml(inner);
    if (!text) return match;
    let id = '';
    const idMatch = /\sid=["']([^"']+)["']/i.exec(attrs || '');
    if (idMatch) {
      id = idMatch[1];
    } else {
      const base = slugify(text);
      id = base;
      let index = 2;
      while (used.has(id)) {
        id = `${base}-${index}`;
        index += 1;
      }
    }
    used.add(id);
    headings.push({ id, text, level: Number(tag.slice(1)) });
    const nextAttrs = (attrs || '').replace(/\sid=["'][^"']*["']/i, '');
    return `<${tag}${nextAttrs} id="${id}">${inner}</${tag}>`;
  });
  return { html: next, headings };
}

/**
 * 文章页。
 *
 * 上游结构（single.php + template-parts/entry.php）：
 *   article.entry.entry-has-hero
 *     ├─ header.entry-hero.glaze-panel（封面 + 标题 + 时间）
 *     ├─ div.entry-main.glaze-panel
 *     │   ├─ div.entry-content（正文）
 *     │   └─ footer.entry-footer（分类 + 标签）
 *     ├─ nav.navigation.post-navigation（上下篇）
 *     └─ section#comments.comments-area.glaze-panel
 */
export default function PostPage({ post }: { post: any; options?: Record<string, string> }) {
  const { timeZone } = useThemeContext();
  const [navigation, setNavigation] = useState<NavigationData | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [readingSize, setReadingSize] = useState(0);

  const content = String(post?.content || post?.html || '');
  const { html: contentHtml, headings } = useMemo(() => withHeadingIds(content), [content]);
  const cover = coverOf(post);
  const categories = categoriesOf(post);
  const tags = tagsOf(post);

  useEffect(() => {
    if (!post?.id) return;
    let cancelled = false;
    fetch(`/api/v1/posts/${post.id}/navigation`)
      .then((r) => r.json())
      .then((r) => {
        if (!cancelled) setNavigation((r.data || r) as NavigationData);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [post?.id]);

  const bumpSize = (delta: number) => {
    setReadingSize((prev) => Math.min(3, Math.max(-2, prev + delta)));
  };

  return (
    <article id={`post-${post?.id}`} className="entry entry-has-hero">
      <header className="entry-hero glaze-panel">
        {cover ? (
          <img className="entry-hero-image" src={cover} alt="" loading="eager" decoding="async" />
        ) : null}
        <div className="entry-hero-copy">
          <h1 className="entry-title">{post?.title || '无标题'}</h1>
          <div className="post-meta">
            <time className="entry-hero-date" dateTime={String(post?.published_at || post?.created_at || '')}>
              {dateTimeLabel(post?.published_at || post?.created_at, timeZone)}
            </time>
            {Number(post?.view_count || 0) ? (
              <span className="post-card-views">
                <i className="fa-regular fa-eye" aria-hidden="true" />
                <span>{Number(post?.view_count || 0)}</span>
              </span>
            ) : null}
            {Number(post?.comment_count || 0) ? (
              <a className="post-card-views" href="#comments">
                <i className="fa-regular fa-comment" aria-hidden="true" />
                <span>{Number(post?.comment_count || 0)}</span>
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="entry-main glaze-panel">
        <div className="entry-reading-controls squircle" data-glaze-reading-size>
          <div className="entry-reading-size" role="group" aria-label="正文字号">
            <button type="button" className="squircle" aria-label="缩小正文字号" data-glaze-reading-smaller onClick={() => bumpSize(-1)}>
              A−
            </button>
            <button type="button" className="squircle" aria-label="放大正文字号" data-glaze-reading-larger onClick={() => bumpSize(1)}>
              A+
            </button>
            <span className="screen-reader-text" aria-live="polite" data-glaze-reading-size-status>
              当前字号 {readingSize > 0 ? `+${readingSize}` : readingSize}
            </span>
          </div>
        </div>

        <div
          className="entry-content"
          data-glaze-image-open="放大图片"
          data-glaze-image-close="关闭图片"
          style={readingSize ? ({ ['--glaze-reading-scale' as string]: String(1 + readingSize * 0.08) } as React.CSSProperties) : undefined}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {categories.length || tags.length ? (
          <footer className="entry-footer">
            {categories.length ? (
              <div className="entry-footer-categories">
                <span className="post-meta-categories">
                  {categories.map((category) => (
                    <Link key={category.slug || category.name} href={categoryHref(category)} prefetch={false}>
                      {category.name}
                    </Link>
                  ))}
                </span>
              </div>
            ) : null}
            {tags.length ? (
              <div className="post-tags">
                {tags.map((tag) => (
                  <Link key={tag.slug || tag.name} href={tagHref(tag)} prefetch={false} rel="tag">
                    <span className="post-tag-hash" aria-hidden="true">#</span>
                    {tag.name}
                    {typeof tag.count === 'number' ? <sup className="post-tag-count">{tag.count}</sup> : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </footer>
        ) : null}
      </div>

      {headings.length > 1 ? (
        <>
          <button
            type="button"
            className="post-toc-trigger control-button squircle"
            data-glaze-toc-open
            aria-label="文章目录"
            onClick={() => setTocOpen(true)}
          >
            <i className="fa-solid fa-list" aria-hidden="true" />
          </button>
          {tocOpen ? (
            <dialog className="post-toc-dialog squircle" open onClose={() => setTocOpen(false)}>
              <div className="post-toc-inner">
                <div className="post-toc-heading">
                  <h2 id="glaze-post-toc-title">文章目录</h2>
                  <form method="dialog">
                    <button type="submit" className="post-toc-close control-button" aria-label="关闭目录">
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  </form>
                </div>
                <ol className="post-toc-list">
                  {headings.map((heading) => (
                    <li key={heading.id} className={`post-toc-item post-toc-level-${heading.level}`}>
                      <a href={`#${heading.id}`} onClick={() => setTocOpen(false)}>
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </dialog>
          ) : null}
        </>
      ) : null}

      <nav className="navigation post-navigation" aria-label="上下篇导航">
        <h2 className="screen-reader-text">上下篇导航</h2>
        <div className="nav-links">
          <div className="nav-previous">
            {navigation?.prev ? (
              <PostLink post={navigation.prev}>
                <span className="post-nav-arrow" aria-hidden="true" />
                <span className="post-nav-title">{navigation.prev.title}</span>
              </PostLink>
            ) : (
              <span className="post-nav-placeholder squircle">
                <span className="post-nav-arrow" aria-hidden="true" />
                <span className="post-nav-title">没有更早的文章</span>
              </span>
            )}
          </div>
          <div className="nav-next">
            {navigation?.next ? (
              <PostLink post={navigation.next}>
                <span className="post-nav-title">{navigation.next.title}</span>
                <span className="post-nav-arrow" aria-hidden="true" />
              </PostLink>
            ) : (
              <span className="post-nav-placeholder squircle">
                <span className="post-nav-title">没有更新的文章</span>
                <span className="post-nav-arrow" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </nav>

      <CommentSection postId={Number(post?.id || 0)} title={post?.title} />
    </article>
  );
}
