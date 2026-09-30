'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { buildPermalink } from '@/lib/permalink';
import { useThemeContext } from '@/lib/theme-context';
import { Icon, resolveDark, useShanYingMode } from './shanying-shared';

type MenuState = { x: number; y: number; href: string | null };

async function copyAddress(address: string, success: string) {
  try {
    await navigator.clipboard.writeText(address);
    toast.success(success);
  } catch {
    toast.error('复制失败，请检查浏览器剪贴板权限');
  }
}

export default function ContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { options } = useThemeContext();
  const { mode, setMode } = useShanYingMode();

  useEffect(() => {
    const open = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('.sy-theme') || target.closest('.sy-context-menu')) return;
      if (window.getSelection()?.toString()) return;
      const link = target.closest('a[href]') as HTMLAnchorElement | null;
      if (target.closest('input, textarea, select, button, [contenteditable], [role="textbox"]')) return;
      if (!link && target.closest('img, video, audio, canvas, pre, code')) return;
      if (!link && target.closest('p, h1, h2, h3, h4, h5, h6, blockquote')) return;
      if (link && !/^https?:$/.test(link.protocol)) return;

      event.preventDefault();
      const rect = target.getBoundingClientRect();
      setMenu({
        x: event.clientX || rect.left + 12,
        y: event.clientY || rect.top + 12,
        href: link?.href || null,
      });
    };
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    const close = () => setMenu(null);

    document.addEventListener('contextmenu', open);
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('contextmenu', open);
      document.removeEventListener('pointerdown', closeOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!menu || !element) return;
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(12, Math.min(menu.x, window.innerWidth - bounds.width - 12))}px`;
    element.style.top = `${Math.max(12, Math.min(menu.y, window.innerHeight - bounds.height - 12))}px`;
    element.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [menu]);

  if (!menu || typeof document === 'undefined') return null;

  const run = (action: () => void | Promise<void>) => {
    setMenu(null);
    void action();
  };
  const scrollTop = () => {
    const scroller = document.querySelector('.blog-main') as HTMLElement | null;
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const visitRandomPost = async () => {
    try {
      const response = await fetch(`/api/v1/posts?type=post&status=publish&per_page=1&order_by=random&_t=${Date.now()}`);
      if (!response.ok) throw new Error('random post request failed');
      const json = await response.json();
      const posts = Array.isArray(json?.data) ? json.data : (json?.data?.posts || []);
      if (!posts[0]) {
        toast.error('暂无可访问文章');
        return;
      }
      window.location.assign(buildPermalink(posts[0], options?.permalink_structure));
    } catch {
      toast.error('随机访问失败');
    }
  };
  const openLink = (newWindow: boolean) => {
    if (!menu.href) return;
    const features = newWindow ? 'popup=yes,width=1100,height=800,noopener,noreferrer' : 'noopener,noreferrer';
    window.open(menu.href, '_blank', features);
  };
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') || []);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="sy-context-menu"
      role="menu"
      aria-label={menu.href ? '链接菜单' : '页面菜单'}
      style={{ left: menu.x, top: menu.y }}
      onKeyDown={onMenuKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="sy-context-menu-toolbar">
        <button type="button" role="menuitem" aria-label="后退" title="后退" onClick={() => run(() => window.history.back())}><Icon name="arrow-left" /></button>
        <button type="button" role="menuitem" aria-label="前进" title="前进" onClick={() => run(() => window.history.forward())}><Icon name="arrow-right" /></button>
        <button type="button" role="menuitem" aria-label="刷新" title="刷新" onClick={() => run(() => window.location.reload())}><Icon name="refresh" /></button>
        <button type="button" role="menuitem" aria-label="返回顶部" title="返回顶部" onClick={() => run(scrollTop)}><Icon name="arrow-up" /></button>
      </div>
      <div className="sy-context-menu-divider" />
      {menu.href && (
        <>
          <button type="button" role="menuitem" className="sy-context-menu-item" onClick={() => run(() => openLink(false))}><Icon name="arrow-up-right" /><span>在新标签页打开</span></button>
          <button type="button" role="menuitem" className="sy-context-menu-item" onClick={() => run(() => openLink(true))}><Icon name="arrow-up-right" /><span>在新窗口打开</span></button>
          <button type="button" role="menuitem" className="sy-context-menu-item" onClick={() => run(() => copyAddress(menu.href!, '已复制链接地址'))}><Icon name="link" /><span>复制链接地址</span></button>
        </>
      )}
      <button type="button" role="menuitem" className="sy-context-menu-item" onClick={() => run(visitRandomPost)}><i className="fa-solid fa-dice" aria-hidden="true" /><span>随机阅读一篇文章</span></button>
      <button type="button" role="menuitem" className="sy-context-menu-item" onClick={() => run(() => copyAddress(window.location.href, '已复制页面地址'))}><Icon name="copy" /><span>复制页面地址</span></button>
      <button type="button" role="menuitem" className="sy-context-menu-item" onClick={() => run(() => setMode(resolveDark(mode) ? 'light' : 'dark'))}><Icon name={resolveDark(mode) ? 'sun' : 'moon'} /><span>切换深浅配色</span></button>
    </div>,
    document.body,
  );
}
