'use client';

/**
 * ShanYing · 浮动侧边栏
 *
 * 右侧固定：文章大纲目录 + 专注阅读 / 打印。
 * 只在宽屏（≥1400px）显示，窄屏和移动端隐藏。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const SCROLL_OFFSET = 88;

export default function FloatingSidebar({ content }: { content: string; postId: number }) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [open, setOpen] = useState(true);
  const [focus, setFocus] = useState(false);
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

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('sy:toc-open', show);
    return () => window.removeEventListener('sy:toc-open', show);
  }, []);

  useEffect(() => () => {
    delete document.documentElement.dataset.syFocus;
  }, []);

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

  const toggleFocus = () => {
    const next = !focus;
    setFocus(next);
    if (next) document.documentElement.dataset.syFocus = '1';
    else delete document.documentElement.dataset.syFocus;
  };

  if (headings.length < 2) return null;
  const baseLevel = Math.min(...headings.map((item) => item.level));

  if (!open) {
    return (
      <button type="button" className="sy-floating-toc-open" onClick={() => setOpen(true)} aria-label="打开文章目录" title="文章目录">
        <i className="fa-solid fa-list-ul" aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside className="sy-floating-sidebar sy-floating-sidebar--visible" ref={tocRef} aria-label="文章目录">
      <header className="sy-floating-toc-header">
        <span>文章目录</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="关闭文章目录"><i className="fa-regular fa-xmark" aria-hidden="true" /></button>
      </header>
      <nav className="sy-floating-toc" aria-label="文章大纲">
        <ul className="sy-floating-toc-list">
          {headings.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => { event.preventDefault(); scrollToHeading(item.id); }}
                className={`sy-floating-toc-item${activeId === item.id ? ' active' : ''}`}
                style={{ paddingLeft: `${(item.level - baseLevel) * 12 + 10}px` }}
                aria-current={activeId === item.id ? 'location' : undefined}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <footer className="sy-floating-toc-actions">
        <button type="button" data-pressed={focus ? 'true' : undefined} onClick={toggleFocus} aria-pressed={focus} aria-label="专注阅读" title="专注阅读"><i className="fa-regular fa-book-open" /></button>
        <button type="button" onClick={() => window.print()} aria-label="打印文章" title="打印文章"><i className="fa-regular fa-print" /></button>
      </footer>
    </aside>
  );
}
