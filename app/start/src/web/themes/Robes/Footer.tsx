'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import { usePathname } from '@/lib/navigation';
import { useThemeContext } from '@/lib/theme-context';
import { IconMore, navIcon } from './Icons';

/**
 * 页脚：桌面端一条版权栏，移动端（≤920px）变成底部 Tab 栏。
 *
 * Tab 内容与原主题一致：首页 + 前三个页面，其余收进「更多」面板。
 */
export default function Footer() {
  const { site, menus, options } = useThemeContext();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const year = new Date().getFullYear();
  const footerText = String(options?.robes_footer_text || '').trim() || `© ${year} ${site.title}`;
  const icp = String(options?.robes_icp || '').trim();

  const pages = (menus.header || []).filter((item) => item && item.href);
  const primary = pages.slice(0, 3);
  const overflow = pages.slice(3);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (!href) return false;
    if (href === '/') return pathname === '/' || /^\/page\/\d+/.test(pathname);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <div className="bottom-bar">
        <span>{footerText}</span>
        {icp ? (
          <>
            <div className="dot" />
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{icp}</a>
          </>
        ) : null}
        <div className="dot" />
        <span>
          Theme{' '}
          <a href="https://robes.xin/" target="_blank" rel="noopener noreferrer">
            Robes
          </a>
        </span>
      </div>

      <nav className="mobile-tabbar" aria-label="移动端导航">
        <Link className={isActive('/') ? 'mtab active' : 'mtab'} href="/">
          {navIcon('首页')}
          <span>首页</span>
        </Link>
        {primary.map((item, index) => (
          <Link
            key={`${item.href}-${index}`}
            className={isActive(item.href) ? 'mtab active' : 'mtab'}
            href={item.href}
            target={item.target}
            rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
          >
            {navIcon(item.label)}
            <span>{item.label}</span>
          </Link>
        ))}
        {overflow.length ? (
          <button
            type="button"
            className={moreOpen ? 'mtab mtab-more active' : 'mtab mtab-more'}
            onClick={() => setMoreOpen((value) => !value)}
            aria-expanded={moreOpen}
            aria-controls="mtabMorePanel"
          >
            <IconMore size={17} />
            <span>更多</span>
          </button>
        ) : null}
      </nav>

      {overflow.length ? (
        <div className={moreOpen ? 'mtab-more-panel open' : 'mtab-more-panel'} id="mtabMorePanel">
          {overflow.map((item, index) => (
            <Link
              key={`${item.href}-${index}`}
              className={isActive(item.href) ? 'mtab-more-item active' : 'mtab-more-item'}
              href={item.href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            >
              {navIcon(item.label)}
              <span className="mtab-more-title">{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
