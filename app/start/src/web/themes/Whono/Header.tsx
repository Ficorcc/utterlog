'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import { usePathname } from '@/lib/navigation';
import { useThemeContext, type MenuItem } from '@/lib/theme-context';
import { IconMenu, IconMoon, IconRss, IconSearch, IconSun } from './Icons';
import { safeHref } from './utils';

const COLOR_KEY = 'whono-color';

/** 递归渲染导航项。子菜单在移动端折叠，桌面端悬浮展开。 */
function NavItems({ items, pathname, close }: { items: MenuItem[]; pathname: string; close: () => void }) {
  const visible = items.filter((item) => safeHref(item.href));
  if (!visible.length) return null;
  return (
    <ul>
      {visible.map((item, index) => (
        <li key={`${item.href}-${index}`}>
          <Link
            href={item.href}
            target={item.target}
            rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            aria-current={pathname === item.href ? 'page' : undefined}
            onClick={close}
          >
            <span>{item.label}</span>
            <span className="wh-dot" aria-hidden="true" />
          </Link>
          {item.children?.length ? (
            <NavItems items={item.children} pathname={pathname} close={close} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Whono 的「Header」实际是左侧栏：站名 + 一句题记 + 右对齐导航 + 底部动作按钮。
 * 深色模式落在 data-whono-color 上（data-theme 已被主题名占用）。
 */
export default function Header() {
  const { site, menus, options } = useThemeContext();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (value: boolean) => {
      setDark(value);
      document.documentElement.dataset.whonoColor = value ? 'dark' : 'light';
    };

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(COLOR_KEY);
    } catch {
      /* 隐私模式读不到，按系统走 */
    }
    apply(stored ? stored === 'dark' : media.matches);

    const onSystemChange = () => {
      try {
        if (localStorage.getItem(COLOR_KEY)) return;
      } catch {
        /* 读不到就当作没存过，继续跟随系统 */
      }
      apply(media.matches);
    };
    media.addEventListener('change', onSystemChange);

    return () => {
      media.removeEventListener('change', onSystemChange);
      delete document.documentElement.dataset.whonoColor;
    };
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.whonoColor = next ? 'dark' : 'light';
    try {
      localStorage.setItem(COLOR_KEY, next ? 'dark' : 'light');
    } catch {
      /* 写不进去也不影响本次切换 */
    }
  };

  const quote = options.whono_quote || site.subtitle || site.description || '';
  const brandMode = options.site_brand_mode || (site.logo ? 'logo' : 'text');
  const showLogo = Boolean(site.logo) && brandMode !== 'text';
  const showText = brandMode !== 'logo' || !site.logo;

  return (
    <aside className="wh-sidebar">
      <a className="wh-skip" href="#wh-main">
        跳到正文
      </a>

      <Link href="/" className="wh-brand" aria-label={`${site.title} 首页`}>
        {showLogo ? (
          <img
            src={dark && site.darkLogo ? site.darkLogo : site.logo}
            alt={brandMode === 'logo' ? site.title : ''}
          />
        ) : null}
        {showText ? <span>{site.title}</span> : null}
      </Link>

      {quote ? <p className="wh-quote">{quote}</p> : null}

      <nav
        id="wh-nav"
        aria-label="主导航"
        className={menuOpen ? 'wh-nav is-open' : 'wh-nav'}
        onClick={() => setMenuOpen(false)}
      >
        <NavItems items={menus.header || []} pathname={pathname} close={() => setMenuOpen(false)} />
      </nav>

      <div className="wh-actions">
        <Link className="wh-icon-btn" href="/search" aria-label="搜索" title="搜索">
          <IconSearch />
        </Link>
        <a className="wh-icon-btn" href="/feed" aria-label="RSS 订阅" title="RSS 订阅">
          <IconRss />
        </a>
        <button
          type="button"
          className="wh-icon-btn wh-theme-toggle"
          onClick={toggleDark}
          aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
          aria-pressed={dark}
          title={dark ? '浅色模式' : '深色模式'}
        >
          {dark ? <IconSun /> : <IconMoon />}
        </button>
        <button
          type="button"
          className="wh-icon-btn wh-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-controls="wh-nav"
          aria-expanded={menuOpen}
          aria-label="菜单"
        >
          <IconMenu />
        </button>
      </div>
    </aside>
  );
}
