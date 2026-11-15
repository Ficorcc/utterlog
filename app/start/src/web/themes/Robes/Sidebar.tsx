'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/AppLink';
import { usePathname } from '@/lib/navigation';
import { useThemeContext, type MenuItem } from '@/lib/theme-context';
import { IconClose, IconFolder, IconTag, navIcon } from './Icons';

/** 侧栏标签最多展示的数量（按文章数降序取前 N 个）。 */
const TAG_LIMIT = 20;

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

  /**
   * 标签只展示文章数最多的前 20 个（侧栏空间有限）。
   * 服务端 listMetas 的排序是 order_num asc, count desc —— 不是纯按文章数，
   * 所以这里自己按 count 降序排一次，数量相同再按名称排，保证顺序稳定。
   */
  const sortedTags = useMemo(
    () =>
      [...tags].sort(
        (a, b) =>
          Number(b.count || 0) - Number(a.count || 0) ||
          a.name.localeCompare(b.name, 'zh-Hans-CN'),
      ),
    [tags],
  );
  const visibleTags = sortedTags.slice(0, TAG_LIMIT);
  const hiddenTagCount = Math.max(0, sortedTags.length - visibleTags.length);

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
                  {visibleTags.map((tag) => (
                    <Link key={tag.id} className="sidebar-tag" href={`/tags/${encodeURIComponent(tag.slug)}`} title={`${tag.count} 篇文章`}>
                      {tag.name}
                    </Link>
                  ))}
                  {hiddenTagCount ? (
                    <Link className="sidebar-tags-more" href="/tags" title={`查看全部 ${sortedTags.length} 个标签`}>
                      还有 {hiddenTagCount} 个
                    </Link>
                  ) : null}
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
