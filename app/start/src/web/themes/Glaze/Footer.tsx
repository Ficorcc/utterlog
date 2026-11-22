'use client';

import Link from '@/components/AppLink';
import { useThemeContext } from '@/lib/theme-context';
import { menuItemIcon, splitMenuLabel } from './nav';
import PalettePicker from './PalettePicker';

/**
 * 页脚。
 *
 * 上游结构：footer.site-footer > div.site-footer-inner
 *   ├─ div.site-footer-meta（版权、统计、页脚菜单）
 *   └─ div.footer-controls（配色 / 深浅色切换）
 */
export default function Footer() {
  const { site, menus, options, archiveStats } = useThemeContext();
  const year = new Date().getFullYear();
  const title = site?.title || 'Utterlog';
  const footerMenu = menus?.footer || [];

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-meta">
            <p className="site-credit">
              © {year}
              <Link href="/">{title}</Link>
            </p>
            <span className="site-footer-stat" lang="zh-CN">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="2.4" />
              </svg>
              总浏览量 <span>{Number(archiveStats?.total_views || 0)}</span>
            </span>
            <span className="site-footer-stat" lang="zh-CN">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <path d="M4 19.5V6.8A1.8 1.8 0 0 1 5.8 5h12.4A1.8 1.8 0 0 1 20 6.8v12.7" />
                <path d="M8 3v4M16 3v4M4 10h16" />
              </svg>
              文章 <span>{Number(archiveStats?.post_count || 0)}</span>
            </span>
            {options?.beian_icp ? (
              <span className="site-footer-stat" lang="zh-CN">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer nofollow">
                  {options.beian_icp}
                </a>
              </span>
            ) : null}
            {footerMenu.length ? (
              <nav className="footer-navigation" aria-label="页脚导航">
                <ul className="site-menu">
                  {footerMenu.map((item, index) => {
                    const icon = menuItemIcon(item);
                    const split = splitMenuLabel(item.label);
                    return (
                      <li key={`${item.href}-${index}`}>
                        <Link href={item.href} prefetch={false} target={item.target}>
                          {icon.fa ? (
                            <span className={`site-nav-icon ${icon.fa}`} aria-hidden="true" />
                          ) : (
                            <span className="site-nav-icon glaze-icon" data-glaze-icon={icon.glaze} aria-hidden="true" />
                          )}
                          <span className="screen-reader-text">{item.label}</span>
                          <span className="site-nav-label" aria-hidden="true">
                            {split ? (
                              <>
                                {split[0]}
                                <br />
                                {split[1]}
                              </>
                            ) : (
                              item.label
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ) : null}
          </div>
          <div className="footer-controls">
            <PalettePicker />
          </div>
        </div>
      </footer>
      <div id="site-bottom" />
    </>
  );
}
