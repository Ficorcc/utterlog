'use client';

/**
 * ShanYing · 浮动侧边栏
 *
 * 右侧固定：大纲目录 + 四箭头导航（← 上一篇 / → 下一篇 / ↑ 顶部 / ↓ 底部）。
 * 只在宽屏（≥1400px）显示，窄屏和移动端隐藏。
 */

import Link from '@/components/AppLink';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface NavPost {
  id: number;
  title: string;
  slug: string;
}

const SCROLL_OFFSET = 88;

export default function FloatingSidebar({ content, postId }: { content: string; postId: number }) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [prevPost, setPrevPost] = useState<NavPost | null>(null);
  const [nextPost, setNextPost] = useState<NavPost | null>(null);
  const [visible, setVisible] = useState(false);
  const tocRef = useRef<HTMLElement>(null);

  // Extract headings from rendered DOM
  useEffect(() => {
    const timer = setTimeout(() => {
      const prose = document.querySelector('.sy-article-text .blog-prose');
      if (!prose) return;
      const els = prose.querySelectorAll('h1[id], h2[id], h3[id]');
      const items: TocItem[] = [];
      els.forEach((el) => {
        items.push({
          id: el.id,
          text: el.textContent || '',
          level: parseInt(el.tagName[1]),
        });
      });
      setHeadings(items);
    }, 150);
    return () => clearTimeout(timer);
  }, [content]);

  // Fetch prev/next posts
  useEffect(() => {
    if (!postId) return;
    fetch(`/api/v1/posts/${postId}/navigation`)
      .then(r => r.json())
      .then(r => {
        const d = r.data || r;
        if (d.prev) setPrevPost({ id: d.prev.id, title: d.prev.title, slug: d.prev.slug });
        if (d.next) setNextPost({ id: d.next.id, title: d.next.title, slug: d.next.slug });
      })
      .catch(() => {});
  }, [postId]);

  // Scroll spy
  useEffect(() => {
    if (headings.length === 0) return;
    const headingEls = headings
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headingEls.length === 0) return;

    const updateActive = () => {
      const activeLine = SCROLL_OFFSET + 4;
      let currentId = headingEls[0].id;
      for (const el of headingEls) {
        if (el.getBoundingClientRect().top <= activeLine) currentId = el.id;
        else break;
      }
      setActiveId(prev => (prev === currentId ? prev : currentId));
    };

    const scroller = (document.querySelector('.blog-main') as HTMLElement | null) || window;
    updateActive();
    scroller.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    return () => {
      scroller.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [headings]);

  // Show/hide based on scroll position
  useEffect(() => {
    const scroller = (document.querySelector('.blog-main') as HTMLElement | null) || window;
    const handleScroll = () => {
      const scrollTop = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
      setVisible(scrollTop > 300);
    };
    handleScroll();
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const scroller = (document.querySelector('.blog-main') as HTMLElement | null) || null;
    if (scroller) {
      const elRect = el.getBoundingClientRect();
      const containerRect = scroller.getBoundingClientRect();
      const y = scroller.scrollTop + (elRect.top - containerRect.top) - SCROLL_OFFSET;
      scroller.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    } else {
      const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }, []);

  const scrollToTop = () => {
    const scroller = (document.querySelector('.blog-main') as HTMLElement | null) || window;
    scroller.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const scroller = (document.querySelector('.blog-main') as HTMLElement | null);
    if (scroller) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  if (headings.length < 2 && !prevPost && !nextPost) return null;

  return (
    <aside className={`sy-floating-sidebar${visible ? ' sy-floating-sidebar--visible' : ''}`} ref={tocRef} aria-label="文章导航">
      {/* 大纲目录 */}
      {headings.length >= 2 && (
        <div className="sy-floating-toc">
          <div className="sy-floating-toc-header">
            <i className="fa-regular fa-list-ul" aria-hidden="true" />
            <span>目录</span>
          </div>
          <ul className="sy-floating-toc-list">
            {headings.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => { e.preventDefault(); scrollToHeading(item.id); }}
                  className={`sy-floating-toc-item${activeId === item.id ? ' active' : ''}`}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 10}px` }}
                  title={item.text}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 四箭头导航 */}
      <div className="sy-floating-nav">
        <div className="sy-floating-nav-row">
          <button type="button" className="sy-floating-nav-btn" onClick={scrollToTop} aria-label="回到顶部" title="回到顶部">
            <i className="fa-regular fa-arrow-up" aria-hidden="true" />
          </button>
        </div>
        <div className="sy-floating-nav-row sy-floating-nav-row--middle">
          {prevPost ? (
            <Link prefetch={false} href={`/posts/${prevPost.slug}`} className="sy-floating-nav-btn" aria-label={`上一篇：${prevPost.title}`} title={`上一篇：${prevPost.title}`}>
              <i className="fa-regular fa-arrow-left" aria-hidden="true" />
            </Link>
          ) : (
            <span className="sy-floating-nav-btn sy-floating-nav-btn--disabled" aria-label="已是第一篇" title="已是第一篇">
              <i className="fa-light fa-arrow-left" aria-hidden="true" />
            </span>
          )}
          {nextPost ? (
            <Link prefetch={false} href={`/posts/${nextPost.slug}`} className="sy-floating-nav-btn" aria-label={`下一篇：${nextPost.title}`} title={`下一篇：${nextPost.title}`}>
              <i className="fa-regular fa-arrow-right" aria-hidden="true" />
            </Link>
          ) : (
            <span className="sy-floating-nav-btn sy-floating-nav-btn--disabled" aria-label="已是最新" title="已是最新">
              <i className="fa-light fa-arrow-right" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="sy-floating-nav-row">
          <button type="button" className="sy-floating-nav-btn" onClick={scrollToBottom} aria-label="回到底部" title="回到底部">
            <i className="fa-regular fa-arrow-down" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
