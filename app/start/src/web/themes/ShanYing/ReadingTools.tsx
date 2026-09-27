'use client';

/**
 * ShanYing · 阅读工具条
 *
 * 原主题的 `.feng-reading-tools`：固定在底部中间的胶囊，展开是文章目录，
 * 另有专注阅读与打印。目录直接复用 Utterlog 的共享 TableOfContents
 * （它从 `.blog-prose` 里读标题，所以必须和 PostContent 同时存在）。
 */

import Link from '@/components/AppLink';
import TableOfContents from '@/components/blog/TableOfContents';
import { useEffect, useRef, useState } from 'react';

export default function ReadingTools({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState(0);
  const [focus, setFocus] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scroller = (document.querySelector('.blog-main') as HTMLElement | null) || null;
    let frame = 0;
    const read = () => {
      frame = 0;
      const target = document.getElementById('sy-article-text');
      if (!target) return;
      const box = target.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const total = box.height - viewport;
      const passed = -box.top;
      setVisible(passed > 220);
      if (total <= 0) {
        setPercent(passed > 0 ? 100 : 0);
        return;
      }
      setPercent(Math.min(100, Math.max(0, Math.round((passed / total) * 100))));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    (scroller || window).addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      (scroller || window).removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const toggleFocus = () => {
    const next = !focus;
    setFocus(next);
    if (typeof document === 'undefined') return;
    if (next) document.documentElement.dataset.syFocus = '1';
    else delete document.documentElement.dataset.syFocus;
  };

  const toTop = () => {
    const target = document.getElementById('sy-article-text');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside className="sy-reading-tools" ref={rootRef} data-open={open ? '1' : undefined} data-visible={visible ? '1' : undefined} aria-label="阅读工具">
      <button type="button" className="sy-reading-btn" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="文章目录" title="文章目录">
        <i className="fa-solid fa-list-ul" aria-hidden="true" />
      </button>

      <span className="sy-reading-percent" title="阅读进度">{percent}%</span>

      <button type="button" className="sy-reading-btn" data-pressed={focus ? 'true' : undefined} onClick={toggleFocus} aria-pressed={focus} aria-label="专注阅读" title="专注阅读">
        <i className="fa-regular fa-book-open" aria-hidden="true" />
      </button>

      <button type="button" className="sy-reading-btn" onClick={() => window.print()} aria-label="打印文章" title="打印文章">
        <i className="fa-regular fa-print" aria-hidden="true" />
      </button>

      <button type="button" className="sy-reading-btn" onClick={toTop} aria-label="回到正文开头" title="回到正文开头">
        <i className="fa-regular fa-arrow-up" aria-hidden="true" />
      </button>

      {open && (
        <div className="sy-reading-panel">
          <header>
            <span>文章目录</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="关闭文章目录">
              <i className="fa-regular fa-xmark" aria-hidden="true" />
            </button>
          </header>
          <div className="sy-reading-toc">
            <TableOfContents content={content} />
          </div>
          <Link prefetch={false} href="/archives" className="sy-reading-more">
            查看全部归档
            <i className="fa-regular fa-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
      )}
    </aside>
  );
}
