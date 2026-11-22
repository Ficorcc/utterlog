'use client';

import Link from '@/components/AppLink';
import { useThemeContext } from '@/lib/theme-context';
import { FALLBACK_MENU, menuItemIcon, splitMenuLabel } from './nav';

/**
 * 顶栏 + 底部 dock。
 *
 * 上游结构：
 *   header.site-header > div.site-brand（标题 / 副标题）+ div.header-controls（搜索 / 账户）
 *   div.site-dock > nav.site-navigation > ul.site-menu（图标式主菜单，固定在视口底部）
 */
export default function Header() {
  const { site, owner, menus } = useThemeContext();
  const menuItems = menus?.header?.length ? menus.header : FALLBACK_MENU;
  const logo = site?.logo || '';
  const title = site?.title || 'Utterlog';

  return (
    <>
      <header className="site-header" id="site-top">
        <div className="site-brand">
          {logo ? (
            <a className="custom-logo-link" href="/" aria-label={title}>
              <img className="custom-logo" src={logo} alt={title} width="40" height="40" />
            </a>
          ) : null}
          <a className="site-title" href="/">
            {logo ? null : <span className="site-brand-mark squircle" aria-hidden="true" />}
            <span className="site-title-label">{title}</span>
          </a>
          {site?.description ? <p className="site-description" title={site.description}>{site.description}</p> : null}
        </div>

        <div className="header-controls">
          <details className="header-search" data-glaze-header-search>
            <summary className="header-control header-search-toggle squircle" aria-label="搜索" aria-controls="glaze-header-search">
              <svg className="header-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="7.2" />
                <path d="m16 16 4.6 4.6" />
              </svg>
              <svg className="header-search-close" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true">
                <path d="m5 5 14 14M19 5 5 19" />
              </svg>
            </summary>
            <div className="header-popup header-search-popup glaze-panel t-dropdown" id="glaze-header-search" data-origin="top-right">
              <form role="search" className="search-form header-search-form" action="/search" method="get">
                <label className="screen-reader-text" htmlFor="glaze-header-search-field">搜索文章</label>
                <div className="header-search-input">
                  <input
                    className="search-field"
                    id="glaze-header-search-field"
                    type="search"
                    name="q"
                    placeholder="搜索文章…"
                    autoComplete="off"
                  />
                </div>
              </form>
            </div>
          </details>

          <details className="header-account" data-glaze-header-account>
            <summary className="header-control header-avatar squircle" aria-label="账户菜单" aria-controls="glaze-account-menu">
              {owner?.avatar ? (
                <img src={owner.avatar} alt="" width="36" height="36" loading="lazy" />
              ) : (
                <span aria-hidden="true">{String(owner?.nickname || title).slice(0, 1)}</span>
              )}
            </summary>
            <nav className="header-popup header-account-popup glaze-panel t-dropdown" id="glaze-account-menu" data-origin="top-right" aria-label="账户菜单">
              <p className="header-account-name">{owner?.nickname || title}</p>
              <a className="squircle" href="/admin">管理后台</a>
              <a className="squircle" href="/">回到首页</a>
              <a className="squircle" href="/about">关于本站</a>
            </nav>
          </details>
        </div>
      </header>

      <div className="site-dock">
        <nav className="site-navigation" aria-label="主导航">
          <ul className="site-menu">
            {menuItems.map((item, index) => {
              const icon = menuItemIcon(item);
              const split = splitMenuLabel(item.label);
              return (
                <li key={`${item.href}-${index}`}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    target={item.target}
                    rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                  >
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
      </div>
    </>
  );
}
