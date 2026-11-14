'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import { usePathname } from '@/lib/navigation';
import { useThemeContext, type MenuItem } from '@/lib/theme-context';
import { IconClose, IconFolder, IconTag, navIcon } from './Icons';

/**
 * 左侧栏：首页 + 页面（后台菜单）+ 分类 + 标签 + 版权信息。
 *
 * 桌面端常驻（靠 CSS sticky 固定），移动端变成抽屉：
 * 顶栏的汉堡按钮广播 robes:open-sidebar，这里监听后加 body.sidebar-open。
 */
export default function Sidebar() {
  const { site, menus, categories, tags, options } = useThemeContext();
  const pathname = usePathname();
  const [catOpen, setCatOpen] = useState(true);
  const [tagOpen, setTagOpen] = useState(true);

  useEffect(() => {
    const open = () => document.body.classList.add('sidebar-open');
    const close = () => document.body.classList.remove('sidebar-open');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('robes:open-sidebar', open);
    window.addEventListener('robes:close-sidebar', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('robes:open-sidebar', open);
      window.removeEventListener('robes:close-sidebar', close);
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('sidebar-open');
    };
  }, []);

  // 路由变化后自动收起移动端抽屉。
  useEffect(() => {
    document.body.classList.remove('sidebar-open');
  }, [pathname]);

  // 菜单里可能也有指向首页的项，这里过滤掉，避免和固定的「首页」重复。
  const pageItems: MenuItem[] = (menus.header || []).filter(
    (item) => item && item.href && item.href !== '/' && !/首页/.test(item.label || ''),
  );
  const year = new Date().getFullYear();
  const footerText = String(options?.robes_footer_text || '').trim() || `© ${year} ${site.title}`;
  const icp = String(options?.robes_icp || '').trim();

  const isActive = (href: string) => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <aside className="sidebar" aria-label="侧边导航">
        <div className="sidebar-mobile-header">
          <button
            type="button"
            className="sidebar-close"
            onClick={() => document.body.classList.remove('sidebar-open')}
            aria-label="关闭导航"
          >
            <IconClose />
          </button>
        </div>

        <div className="nav-group">
          <Link className={isActive('/') ? 'nav-item active' : 'nav-item'} href="/">
            {navIcon('首页')}
            首页
          </Link>
          {pageItems.map((item, index) => (
            <Link
              key={`${item.href}-${index}`}
              className={isActive(item.href) ? 'nav-item active' : 'nav-item'}
              href={item.href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            >
              {navIcon(item.label)}
              {item.label}
              {typeof item.count === 'number' ? <span className="nav-count">{item.count}</span> : null}
            </Link>
          ))}
        </div>

        {categories.length ? (
          <>
            <div className="nav-divider" />
            <div className="nav-group">
              <div className="nav-group-title">
                <span>分类</span>
                <button
                  type="button"
                  className="section-toggle-btn"
                  onClick={() => setCatOpen((value) => !value)}
                  aria-expanded={catOpen}
                  aria-label="收起或展开分类"
                >
                  <span className={catOpen ? 'section-arrow is-open' : 'section-arrow'}>⌃</span>
                </button>
              </div>
              <div className="section-list" id="categoryList" hidden={!catOpen}>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    className={isActive(`/categories/${category.slug}`) ? 'nav-item active' : 'nav-item'}
                    href={`/categories/${encodeURIComponent(category.slug)}`}
                  >
                    <IconFolder />
                    {category.name}
                    <span className="nav-count">{category.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {tags.length ? (
          <>
            <div className="nav-divider" />
            <div className="nav-group">
              <div className="nav-group-title">
                <span>标签</span>
                <button
                  type="button"
                  className="section-toggle-btn"
                  onClick={() => setTagOpen((value) => !value)}
                  aria-expanded={tagOpen}
                  aria-label="收起或展开标签"
                >
                  <span className={tagOpen ? 'section-arrow is-open' : 'section-arrow'}>⌃</span>
                </button>
              </div>
              <div className="section-list" id="tagList" hidden={!tagOpen}>
                <div className="sidebar-tags">
                  {tags.map((tag) => (
                    <Link key={tag.id} className="sidebar-tag" href={`/tags/${encodeURIComponent(tag.slug)}`} title={`${tag.count} 篇文章`}>
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="sidebar-footer">
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
      </aside>

      <div
        className="sidebar-overlay"
        onClick={() => document.body.classList.remove('sidebar-open')}
        aria-hidden="true"
      />
    </>
  );
}
