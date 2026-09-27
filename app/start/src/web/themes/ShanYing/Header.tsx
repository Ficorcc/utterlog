'use client';

/**
 * ShanYing · Header
 *
 * 原主题的导航是一条悬浮胶囊：页面顶部完全透明（让 Hero 山水图透过来），
 * 一旦滚动就把自己收窄成一个玻璃胶囊。这里保留这个行为，滚动容器是
 * Utterlog 的 `.blog-main`（globals.css 里 `overflow-y: scroll !important`），
 * 不是 window —— 监听错了整条动效就永远不会触发。
 */

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { buildPermalink } from '@/lib/permalink';
import { usePathname } from '@/lib/navigation';
import { useThemeContext, type MenuItem } from '@/lib/theme-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import NavMenu, { MenuTree } from './NavMenu';
import { Icon, cycleMode, modeLabel, useShanYingMode } from './shanying-shared';

const API_BASE = '/api/v1';

/** 找到真正的滚动容器：Utterlog 全站用 `.blog-main`，兜底才用 window。 */
function getScroller(): HTMLElement | Window {
  if (typeof document === 'undefined') return window;
  return (document.querySelector('.blog-main') as HTMLElement | null) || window;
}

export default function Header() {
  const pathname = usePathname();
  const { menus, site, options } = useThemeContext();
  const { mode, setMode } = useShanYingMode();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const gliderRef = useRef<HTMLSpanElement>(null);

  const siteName = site.title || 'Utterlog';
  const navItems: MenuItem[] = menus.header ?? [];

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setRandomLoading(false);
  }, [pathname]);

  // 顶部透明 / 滚动成胶囊
  useEffect(() => {
    const scroller = getScroller();
    let frame = 0;
    const read = () => {
      frame = 0;
      const top = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
      setScrolled(top > 24);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    // rAF 被节流（后台标签、构建期高负载）时 scroll 回调可能落不了地，头部会卡在
    // 「透明白字」态、压在浅色正文上什么都看不见。scrollend 与可见性变化各补读一次。
    scroller.addEventListener('scrollend', read);
    document.addEventListener('visibilitychange', read);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('scrollend', read);
      document.removeEventListener('visibilitychange', read);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [searchOpen]);

  // 菜单下划线滑块：跟随当前项，若没有匹配项就跟随被悬停/聚焦的项。
  const isActive = useCallback(
    (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href)),
    [pathname],
  );

  const moveGlider = useCallback((target: HTMLElement | null) => {
    const glider = gliderRef.current;
    const nav = navRef.current;
    if (!glider || !nav) return;
    if (!target) {
      glider.classList.remove('is-ready');
      glider.style.opacity = '0';
      return;
    }
    const navBox = nav.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    glider.style.transform = `translate(${box.left - navBox.left + nav.scrollLeft}px, ${box.top - navBox.top + nav.scrollTop}px)`;
    glider.style.width = `${box.width}px`;
    glider.style.height = `${box.height}px`;
    glider.style.opacity = '1';
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Reposition the highlight after navigation or header size changes.
    const visibleLinks = () => [...nav.querySelectorAll<HTMLElement>('.sy-nav-link')]
      .filter((el) => el.getClientRects().length > 0);
    const anchor = () => {
      const links = visibleLinks();
      return links.find((el) => el.classList.contains('is-active')) || links[0] || null;
    };
    const frame = window.requestAnimationFrame(() => moveGlider(anchor()));
    const onResize = () => moveGlider(anchor());
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [moveGlider, navItems.length, pathname, scrolled]);

  useEffect(() => {
    const q = query.trim();
    if (!searchOpen || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const resp = await fetch(`${API_BASE}/posts?status=publish&per_page=6&search=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const json = await resp.json();
        const list = Array.isArray(json?.data) ? json.data : (json?.data?.posts || []);
        setResults(list);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchOpen]);

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const q = query.trim();
    if (!q) return;
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  };

  const visitRandomPost = async () => {
    if (randomLoading) return;
    setRandomLoading(true);
    const startedAt = Date.now();
    try {
      const resp = await fetch(`${API_BASE}/posts?type=post&status=publish&per_page=1&order_by=random&_t=${Date.now()}`);
      if (!resp.ok) throw new Error('random post request failed');
      const json = await resp.json();
      const list = Array.isArray(json?.data) ? json.data : (json?.data?.posts || []);
      const post = list[0];
      if (!post) {
        toast.error('暂无可访问文章');
        setRandomLoading(false);
        return;
      }
      const href = buildPermalink(post, options?.permalink_structure);
      const wait = Math.max(0, 700 - (Date.now() - startedAt));
      window.setTimeout(() => {
        window.location.href = href;
      }, wait);
    } catch {
      toast.error('随机访问失败');
      setRandomLoading(false);
    }
  };

  const renderNavItem = (item: MenuItem) => {
    const active = isActive(item.href || '#');
    if (item.children?.length) return <NavMenu key={`${item.href}-${item.label}`} item={item} active={active} highlight={moveGlider} />;
    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={item.href || '#'}
        className={`sy-nav-link${active ? ' is-active' : ''}`}
        onMouseEnter={(event) => moveGlider(event.currentTarget)}
        onFocus={(event) => moveGlider(event.currentTarget)}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <header className="sy-header" data-scrolled={scrolled ? '1' : '0'}>
        <nav className="sy-nav" aria-label="主导航" ref={navRef} onMouseLeave={() => {
          const active = navRef.current?.querySelector<HTMLElement>('.sy-nav-link.is-active')
            || navRef.current?.querySelector<HTMLElement>('.sy-nav-link');
          moveGlider(active || null);
        }}>
          <span className="sy-nav-glider" ref={gliderRef} aria-hidden="true" />
          {navItems.map(renderNavItem)}
        </nav>

        <Link href="/" className="sy-brand" aria-label={siteName}>
          <span className="sy-brand-avatar" aria-hidden="true">
            {site.logo || site.darkLogo ? (
              <img src={site.logo || site.darkLogo} alt="" />
            ) : site.title ? (
              site.title.slice(0, 1)
            ) : (
              <i className="fa-regular fa-mountain" aria-hidden="true" />
            )}
          </span>
          <span className="sy-brand-title">
            {siteName}
            {site.subtitle ? <small>{site.subtitle}</small> : null}
          </span>
        </Link>

        <div className="sy-tools">
          <div className="sy-search" data-open={searchOpen ? '1' : undefined}>
            <form className="sy-search-form" role="search" onSubmit={submitSearch}>
              <input
                ref={searchInputRef}
                type="search"
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文章…"
                autoComplete="off"
                aria-label="搜索文章"
                tabIndex={searchOpen ? 0 : -1}
              />
              <button type="submit" aria-label="提交搜索">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              </button>
            </form>
            <button
              type="button"
              className="sy-icon-button"
              data-search-toggle="1"
              aria-expanded={searchOpen}
              aria-label={searchOpen ? '收起搜索' : '打开搜索'}
              title="搜索（⌘K）"
              onClick={() => setSearchOpen((value) => !value)}
            >
              <Icon name={searchOpen ? 'close' : 'search'} />
            </button>
          </div>

          <button
            type="button"
            className={`sy-icon-button${randomLoading ? ' is-loading' : ''}`}
            title="随机阅读一篇文章"
            aria-label="随机阅读一篇文章"
            aria-busy={randomLoading}
            onClick={visitRandomPost}
          >
            {randomLoading
              ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
              : <i className="fa-solid fa-dice" aria-hidden="true" />}
          </button>

          <button
            type="button"
            className="sy-icon-button sy-mode-toggle"
            data-mode={mode}
            title={`配色：${modeLabel(mode)}（点击切换）`}
            aria-label={`配色：${modeLabel(mode)}，点击切换`}
            onClick={() => setMode(cycleMode(mode))}
          >
            <i className="fa-solid fa-desktop sy-mode-icon sy-mode-system" aria-hidden="true" />
            <i className="fa-regular fa-moon sy-mode-icon sy-mode-moon" aria-hidden="true" />
            <i className="fa-regular fa-sun sy-mode-icon sy-mode-sun" aria-hidden="true" />
          </button>

          <a className="sy-icon-button" href="https://ficor.net/feed" title="RSS 订阅" aria-label="RSS 订阅">
            <i className="fa-regular fa-rss" aria-hidden="true" />
          </a>

          {/* 站点控制面板入口：三条横线（对照原主题头部网格按钮，这里按需求
              用三横线造型），点开独立页面而不是原主题的浮层。 */}
          <Link
            href="/dashboard"
            className={`sy-icon-button sy-dash-toggle${pathname === '/dashboard' ? ' is-active' : ''}`}
            title="站点控制面板"
            aria-label="打开站点控制面板"
            aria-current={pathname === '/dashboard' ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6.5h16" />
              <path d="M4 12h16" />
              <path d="M4 17.5h16" />
            </svg>
          </Link>

          <button
            type="button"
            className="sy-icon-button sy-menu-morph"
            data-open={mobileOpen ? 'true' : 'false'}
            aria-label={mobileOpen ? '收起菜单' : '展开菜单'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path className="sy-menu-morph-top" d="M4 7h16" />
              <path className="sy-menu-morph-middle" d="M4 12h16" />
              <path className="sy-menu-morph-bottom" d="M4 17h16" />
            </svg>
          </button>
        </div>

        {searchOpen && (
          <div className="sy-search-panel" role="dialog" aria-modal="false" aria-label="搜索结果">
            {searching && <p className="sy-search-empty">搜索中…</p>}
            {!searching && query.trim().length < 2 && <p className="sy-search-empty">输入至少两个字符开始搜索</p>}
            {!searching && query.trim().length >= 2 && results.length === 0 && <p className="sy-search-empty">没有匹配文章</p>}
            {results.map((post) => (
              <PostLink key={post.id} post={post} className="sy-search-result" onClick={() => setSearchOpen(false)}>
                <span>{post.title}</span>
                <small>{post.categories?.[0]?.name || '文章'}</small>
              </PostLink>
            ))}
          </div>
        )}
      </header>

      {mobileOpen && (
        <nav className="sy-mobile-nav" aria-label="移动导航">
          <MenuTree items={navItems} close={() => setMobileOpen(false)} />
        </nav>
      )}
    </>
  );
}
