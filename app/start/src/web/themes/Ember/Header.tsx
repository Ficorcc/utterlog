'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/AppLink';
import { usePathname } from '@/lib/navigation';
import { useAuthStore } from '@/lib/store';
import { useThemeContext, type MenuItem } from '@/lib/theme-context';
import { categoryColor } from './utils';

/** 收进「更多」浮层的次级页面（对应上游的 navMoreItems） */
const MORE_ITEMS: { label: string; href: string; icon: string }[] = [
  { label: '说说', href: '/moments', icon: 'fa-solid fa-head-side-speak' },
  { label: '归档', href: '/archives', icon: 'fa-solid fa-box-archive' },
  { label: '友链', href: '/links', icon: 'fa-solid fa-user-group' },
  { label: '朋友圈', href: '/friends', icon: 'fa-solid fa-people-group' },
  { label: '订阅', href: '/feeds', icon: 'fa-solid fa-square-rss' },
  { label: '关于我', href: '/about', icon: 'fa-regular fa-circle-user' },
];

const FALLBACK_MENUS: MenuItem[] = [
  { href: '/moments', label: '说说', icon: 'fa-solid fa-head-side-speak' },
  { href: '/archives', label: '归档', icon: 'fa-solid fa-box-archive' },
];

/** 本机缓存的访客评论身份（评论区保存后写入） */
interface CachedVisitor {
  name?: string;
  email?: string;
  url?: string;
}

/** 读取本机缓存的评论身份 */
function readVisitor(): CachedVisitor | null {
  try {
    const raw = window.localStorage.getItem('comment_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedVisitor;
    return parsed?.name || parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

/** 访客头像：优先用它自己填的网站图标，没有就用通用头像图标 */
function visitorAvatar(visitor: CachedVisitor | null) {
  const host = String(visitor?.url || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0];
  if (!host) return '';
  return `https://favicon.im/${encodeURIComponent(host)}`;
}

export default function Header() {
  const pathname = usePathname();
  const { site, owner, menus, categories } = useThemeContext();
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [identityOpen, setIdentityOpen] = useState(false);
  const [visitor, setVisitor] = useState<CachedVisitor | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const identityTimerRef = useRef<number | null>(null);

  // 站点主人（已登录）走后台，访客走自己的评论身份
  const { user, accessToken } = useAuthStore();
  const isOwner = !!accessToken && !!user;

  // 首页入口由头像承担（点头像回首页），归档与关于收进头像菜单 / 移动端「更多」，
  // 导航条里不再重复摆这几个入口，否则顶部挤满同义项。
  const navItems = (menus.header?.length ? menus.header : FALLBACK_MENUS).filter(
    (item) => item.href !== '/' && item.href !== '/archives' && item.href !== '/about' && item.label !== '首页',
  );

  useEffect(() => {
    const saved = (() => {
      try {
        return window.localStorage.getItem('ember-mode');
      } catch {
        return null;
      }
    })();
    const next = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setMode(next);
    document.documentElement.setAttribute('data-ember-mode', next);
  }, []);

  useEffect(() => {
    setNavOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // 访客身份：评论成功后本机会写入 comment_user，路由切换时同步一次
  useEffect(() => {
    setVisitor(readVisitor());
  }, [pathname]);

  useEffect(() => {
    const sync = () => setVisitor(readVisitor());
    window.addEventListener('utterlog-comment-user', sync);
    return () => window.removeEventListener('utterlog-comment-user', sync);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [searchOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMoreOpen(false);
        setNavOpen(false);
        setIdentityOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (identityTimerRef.current) window.clearTimeout(identityTimerRef.current);
    };
  }, []);

  const toggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    document.documentElement.setAttribute('data-ember-mode', next);
    try {
      window.localStorage.setItem('ember-mode', next);
    } catch {
      /* 隐私模式下忽略 */
    }
  };

  const isActive = (href: string) => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // 按钮文案始终指向「点击后将切换到的模式」
  const modeToggleLabel = mode === 'dark' ? '切换浅色模式' : '切换深色模式';

  // 头像快捷菜单（上游：悬停头像展开，2 秒无操作自动收起）
  const openIdentityMenu = () => {
    if (identityTimerRef.current) {
      window.clearTimeout(identityTimerRef.current);
      identityTimerRef.current = null;
    }
    setIdentityOpen(true);
    identityTimerRef.current = window.setTimeout(() => setIdentityOpen(false), 2600);
  };

  const closeIdentityMenu = () => {
    if (identityTimerRef.current) {
      window.clearTimeout(identityTimerRef.current);
      identityTimerRef.current = null;
    }
    setIdentityOpen(false);
  };

  const avatarUrl = owner?.avatar || site?.logo || '';
  const visitorImg = visitorAvatar(visitor);

  /**
   * 悬浮条上的「评论身份」入口（上游：side-identity）。
   * 博主进后台改评论，访客回到评论表单填自己的身份。
   */
  const handleIdentity = () => {
    if (isOwner) {
      window.location.href = '/admin/comments';
      return;
    }
    const form = document.querySelector('#comments .comment-form') as HTMLElement | null;
    if (!form) {
      // 本页没有评论区，去留言板 —— 那里同样能填写评论身份
      window.location.href = '/guestbook';
      return;
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // 已经记过身份时，表单默认收起，先点「更换资料」把它展开
    const editBtn = Array.from(form.querySelectorAll('button')).find(
      (btn) => (btn.textContent || '').trim() === '更换资料',
    );
    if (editBtn) editBtn.click();
    window.setTimeout(() => {
      const nickname = form.querySelector('input[placeholder*="昵称"]') as HTMLInputElement | null;
      const firstInput = form.querySelector('input:not([type="hidden"])') as HTMLInputElement | null;
      const textarea = form.querySelector('textarea') as HTMLTextAreaElement | null;
      (nickname || firstInput || textarea)?.focus({ preventScroll: true });
    }, 400);
  };

  return (
    <>
      <nav className="site-nav-bar">
        <div className={`nav-pill${navOpen ? ' nav-open' : ''}`} id="nav-shell">
          <div className="nav-row">
            <div
              className={`nav-identity-orb${identityOpen ? ' is-menu-open' : ''}`}
              data-nav-identity
              data-nav-admin="0"
              onMouseEnter={openIdentityMenu}
              onMouseLeave={closeIdentityMenu}
            >
              <Link
                href="/"
                className={`nav-avatar${pathname === '/' ? ' active' : ''}`}
                title={owner?.nickname || site?.title || '首页'}
                aria-label="返回首页"
                aria-haspopup="true"
                aria-expanded={identityOpen}
                onFocus={openIdentityMenu}
              >
                {avatarUrl ? (
                  <img className="nav-avatar-img" src={avatarUrl} alt={owner?.nickname || site?.title || ''} width={32} height={32} loading="lazy" />
                ) : (
                  <span className="nav-avatar-fallback"><i className="fa-solid fa-house" aria-hidden="true" /></span>
                )}
                <span className="nav-avatar-home" aria-hidden="true"><i className="fa-solid fa-house" aria-hidden="true" /></span>
              </Link>
              <div className="nav-identity-actions" aria-label="头像快捷菜单">
                <Link href="/login" className="nav-identity-action nav-identity-profile" aria-label="登录" title="登录">
                  <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                </Link>
                <Link href="/about" className="nav-identity-action nav-identity-about" aria-label="关于我" title="关于我">
                  <i className="fa-regular fa-circle-user" aria-hidden="true" />
                </Link>
                <Link href="/archives" className="nav-identity-action nav-identity-archives" aria-label="归档" title="归档">
                  <i className="fa-solid fa-box-archive" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="nav-main-links">
              <button
                type="button"
                className="nav-link nav-dd-trigger"
                aria-haspopup="true"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((open) => !open)}
              >
                <i className="fa-regular fa-file-lines nav-link-icon" aria-hidden="true" />
                <span>文章</span>
                <i className="fa-solid fa-chevron-down nav-dd-caret" aria-hidden="true" />
              </button>
              {navItems.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  target={item.target}
                  className={`nav-link${isActive(item.href) ? ' active' : ''}`}
                >
                  <i className={`${item.icon || 'fa-regular fa-file-lines'} nav-link-icon`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="nav-actions">
              <Link href="/dashboard" className={`nav-cta${isActive('/dashboard') ? ' active' : ''}`}>
                <i className="fa-solid fa-chart-simple nav-activity-bars" aria-hidden="true" />
                <i className="fa-solid fa-gamepad nav-cta-mobile-icon" aria-hidden="true" />
                <span>动态</span>
              </Link>
              <button
                type="button"
                className={`nav-more-toggle${moreOpen ? ' is-open' : ''}`}
                aria-label="更多"
                aria-expanded={moreOpen}
                aria-haspopup="true"
                onClick={() => setMoreOpen((open) => !open)}
              >
                <i className="fa-solid fa-bars nav-more-bars" aria-hidden="true" />
                <i className="fa-solid fa-circle-xmark nav-more-close" aria-hidden="true" />
                <span>更多</span>
              </button>
              <div className={`nav-more-menu${moreOpen ? ' is-open' : ''}`} role="menu" aria-label="更多页面">
                {MORE_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-more-item" role="menuitem">
                    <i className={`${item.icon} nav-link-icon`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="nav-drawer">
            <div className="nav-cat-list">
              {categories.map((cat, index) => (
                <Link key={cat.id} href={`/categories/${cat.slug}`} className={`nav-cat-item cat-color-${categoryColor(index)}`}>
                  <span className="nav-cat-ico"><i className={cat.icon || 'fa-regular fa-folder'} aria-hidden="true" /></span>
                  <span className="nav-cat-name">{cat.name}</span>
                  <span className="nav-cat-desc">{cat.count} 篇</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <div className="side-quick-actions" aria-label="快捷操作">
        {isOwner ? (
          <Link href="/admin/comments" className="side-admin-entry" aria-label="进入后台管理评论" title="进入后台管理评论">
            <i className="fa-solid fa-gauge-high" aria-hidden="true" />
          </Link>
        ) : (
          <div className={`side-identity${visitorImg ? ' has-identity' : ''}`} data-side-identity>
            <button
              type="button"
              className="side-identity-trigger"
              aria-label="评论身份"
              title="评论身份"
              onClick={handleIdentity}
            >
              <img className="side-identity-avatar" src={visitorImg} alt="" hidden={!visitorImg} />
              <span className="side-identity-fallback" aria-hidden="true">
                <i className="fa-regular fa-circle-user" aria-hidden="true" />
              </span>
            </button>
            <div className="side-identity-card" aria-hidden="true">
              <span className="side-identity-name">{visitor?.name || ''}</span>
              <span className="side-identity-stat">
                {visitor ? '欢迎回来 👋 点这里更换资料' : '设置评论身份，留下你的足迹'}
              </span>
            </div>
          </div>
        )}
        <button type="button" className="side-search-toggle" aria-label="搜索" title="搜索" onClick={() => setSearchOpen(true)}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        </button>
        <button type="button" className="side-theme-toggle" aria-label={modeToggleLabel} title={modeToggleLabel} onClick={toggleMode}>
          <span className="side-theme-icon" aria-hidden="true">
            <i className="fa-solid fa-moon theme-icon-moon" aria-hidden="true" />
            <i className="fa-solid fa-sun theme-icon-sun" aria-hidden="true" />
          </span>
          <span className="side-theme-label">{mode === 'dark' ? '浅色模式' : '深色模式'}</span>
        </button>
      </div>

      <div className={`site-search-overlay${searchOpen ? ' is-open' : ''}`} hidden={!searchOpen} onClick={() => setSearchOpen(false)}>
        <div className="site-search-panel" role="search" aria-label="站内搜索" onClick={(event) => event.stopPropagation()}>
          <form action="/search" method="get" className="site-search-pop-form">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input ref={searchInputRef} type="search" name="q" defaultValue="" placeholder="搜索文章、页面、说说" autoComplete="off" data-search-input />
            <button type="submit">搜索</button>
            <button type="button" className="site-search-close" aria-label="关闭搜索" onClick={() => setSearchOpen(false)}>
              <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
