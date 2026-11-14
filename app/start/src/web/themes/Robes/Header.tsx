'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import { usePathname } from '@/lib/navigation';
import { useThemeContext } from '@/lib/theme-context';
import NoticePanel from './NoticePanel';
import {
  IconBell,
  IconClose,
  IconInfo,
  IconMenu,
  IconMoon,
  IconSearch,
  IconSun,
} from './Icons';

const MODE_KEY = 'robes-mode';

function readMode(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.dataset.robesMode;
  return attr === 'dark' ? 'dark' : 'light';
}

/**
 * 顶栏：品牌 / 搜索 / 通知面板 / 滚动进度 / 深色模式。
 *
 * 结构与原主题 header.php 一致；图标换成内联 SVG（原版用 Remix Icon 字体）。
 */
export default function Header() {
  const { site, options } = useThemeContext();
  const pathname = usePathname();
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    setDark(readMode() === 'dark');
  }, []);

  // 滚动进度：原主题监听的是内容滚动容器 .content-scroll，这里沿用同一容器。
  useEffect(() => {
    const sync = () => {
      const feed = document.getElementById('feed');
      if (!feed) {
        setPercent(0);
        return;
      }
      const max = feed.scrollHeight - feed.clientHeight;
      const value = max > 4 ? Math.min(100, Math.round((feed.scrollTop / max) * 100)) : 0;
      setPercent(value);
      // 滚动到上下边缘时给内容容器打标记，CSS 用它做边缘渐隐遮罩。
      feed.classList.toggle('fade-top-on', feed.scrollTop > 8);
      feed.classList.toggle(
        'fade-bottom-on',
        feed.scrollTop + feed.clientHeight < feed.scrollHeight - 8,
      );
    };
    const feed = document.getElementById('feed');
    feed?.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
    return () => {
      feed?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [pathname]);

  const toggleDark = () => {
    const next = document.documentElement.dataset.robesMode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.robesMode = next;
    setDark(next === 'dark');
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* 隐私模式写不进去也不影响本次切换 */
    }
  };

  const scrollTop = () => {
    const feed = document.getElementById('feed');
    if (feed) feed.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const brandMark = site.logo ? (
    <img className="brand-logo-img" src={site.logo} alt={site.title} />
  ) : (
    <div className="brand-icon">{String(site.title || 'U').slice(0, 1)}</div>
  );

  const ringLength = 2 * Math.PI * 14;

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-btn info-btn"
        onClick={() => setInfoOpen((value) => !value)}
        aria-label="站点信息"
        aria-expanded={infoOpen}
        title="站点信息"
      >
        <span className="topbar-ico">
          <IconInfo size={20} />
        </span>
      </button>

      <button
        type="button"
        className="topbar-btn m-search-btn"
        onClick={() => setSearchOpen((value) => !value)}
        aria-label="搜索"
        aria-expanded={searchOpen}
        title="搜索"
      >
        <span className="topbar-ico">
          <IconSearch size={20} />
        </span>
      </button>

      <button
        type="button"
        className="hamburger"
        onClick={() => window.dispatchEvent(new Event('robes:open-sidebar'))}
        aria-label="打开导航"
        title="导航"
      >
        <span className="topbar-ico">
          <IconMenu size={20} />
        </span>
      </button>

      <Link href="/" className="topbar-brand" aria-label={`${site.title} 首页`}>
        {brandMark}
        <span className="brand-name">{site.title}</span>
      </Link>

      <div className="topbar-center">
        <span className="topbar-search-ico">
          <IconSearch size={18} />
        </span>
        <form action="/search" method="get" style={{ display: 'contents' }}>
          <input
            className="topbar-search"
            type="text"
            name="q"
            placeholder="搜索文章…"
            defaultValue=""
          />
        </form>
        {site.logo ? (
          <img className="m-brand-logo-img" src={site.logo} alt="" />
        ) : (
          <div className="m-brand-icon">{String(site.title || 'U').slice(0, 1)}</div>
        )}
        <span className="m-brand-name">{site.title}</span>
      </div>

      {infoOpen ? (
        <div className="site-info-pop active">
          <span>{String(options?.robes_footer_text || '').trim() || `© ${new Date().getFullYear()} ${site.title}`}</span>
          {String(options?.robes_icp || '').trim() ? (
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
              {String(options?.robes_icp || '').trim()}
            </a>
          ) : null}
          <span>
            Theme{' '}
            <a href="https://robes.xin/" target="_blank" rel="noopener noreferrer">
              Robes
            </a>
          </span>
        </div>
      ) : null}

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        <button
          type="button"
          className={noticeOpen ? 'topbar-btn notice-btn is-open' : 'topbar-btn notice-btn'}
          onClick={() => setNoticeOpen((value) => !value)}
          aria-label="通知与公告"
          aria-haspopup="true"
          aria-expanded={noticeOpen}
          title="通知与公告"
        >
          <span className="notice-ico">
            <IconBell size={20} />
          </span>
        </button>

        {noticeOpen ? <NoticePanel onClose={() => setNoticeOpen(false)} /> : null}

        <button
          type="button"
          className="topbar-btn scroll-progress-btn"
          onClick={scrollTop}
          title="回到顶部"
          aria-label={`回到顶部，已滚动 ${percent}%`}
        >
          <svg className="scroll-progress-ring" viewBox="0 0 34 34">
            <circle className="scroll-progress-bg" cx="17" cy="17" r="14" />
            <circle
              className="scroll-progress-bar"
              cx="17"
              cy="17"
              r="14"
              strokeDasharray={ringLength}
              strokeDashoffset={ringLength * (1 - percent / 100)}
            />
          </svg>
          <span className="scroll-progress-text">{percent}</span>
        </button>

        <button
          type="button"
          className="topbar-btn theme-toggle"
          onClick={toggleDark}
          title="切换深色模式"
          aria-label="切换深色模式"
          aria-pressed={dark}
        >
          <span className="theme-ico theme-ico-moon">
            <IconMoon size={19} />
          </span>
          <span className="theme-ico theme-ico-sun">
            <IconSun size={19} />
          </span>
        </button>
      </div>

      {searchOpen ? (
        <div className="m-search-pop is-open" aria-hidden={!searchOpen}>
          <form action="/search" method="get" className="m-search-form">
            <span className="topbar-ico">
              <IconSearch size={18} />
            </span>
            <input type="text" name="q" placeholder="搜索文章…" autoFocus />
          </form>
          <button
            type="button"
            className="m-search-close"
            onClick={() => setSearchOpen(false)}
            aria-label="关闭搜索"
          >
            <span className="topbar-ico">
              <IconClose size={18} />
            </span>
          </button>
        </div>
      ) : null}
    </header>
  );
}
