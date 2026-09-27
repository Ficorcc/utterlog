'use client';

/**
 * ShanYing · Footer
 *
 * 原主题页脚 = 一张横向山水图 + 版权行 + 备案行。Utterlog 没有备案设置，
 * 这里把备案位替换成站点统计（总浏览 / 文章 / 评论）与页脚菜单，
 * 保留「图在上、信息在下」的版式与间距。
 *
 * 2026-09-27 调整：
 *   - 去掉页脚导航里的 RSS 链接（订阅入口已在别处，页脚不再重复）
 *   - 去掉 owner.bio 那一行，legal 区只留站点副标题那行
 *   - 统计项改成「图标 · 数字 · 标签」的顺序，数字紧跟图标
 *   - 博主入口（HomeAuthDock）从首页左下角浮层挪到 legal 行右侧，
 *     用 usePathname() 守住「只在首页出现」
 */

import Link from '@/components/AppLink';
import { useEffect, useRef } from 'react';
import { useThemeContext } from '@/lib/theme-context';
import { usePathname } from '@/lib/navigation';
import { datePartsInTimeZone, resolveSiteTimeZone } from '@/lib/timezone';
import { currentSeason, seasonImageUrl } from './shanying-scene';
import HomeAuthDock from './HomeAuthDock';

export default function Footer() {
  const { site, menus, archiveStats, options, timeZone } = useThemeContext();
  const footerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // 博主入口原本挂在 HomePage 里，天然只在首页；挪进页脚（全局组件）之后
  // 得自己判断，不然每页页脚都会多出一颗登录按钮。
  const isHome = pathname === '/';
  // Keep the existing floating controls above the footer instead of covering its text.
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const root = document.documentElement;
    let visible = false;
    const update = () => root.style.setProperty('--sy-footer-clearance', visible ? `${footer.offsetHeight + 16}px` : '0px');
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { root: document.querySelector('.blog-main') });
    const resize = new ResizeObserver(update);
    observer.observe(footer);
    resize.observe(footer);
    return () => {
      observer.disconnect();
      resize.disconnect();
      root.style.removeProperty('--sy-footer-clearance');
    };
  }, []);

  const year = new Date().getFullYear();
  const siteName = site.title || 'Utterlog';
  const footerItems = menus.footer || [];

  // 四季底图：原主题按月份换图。月份取站点时区，避免服务端/浏览器时区
  // 跨月时 SSR 与 hydration 拿到不一样的季节。
  const tz = timeZone || resolveSiteTimeZone(options);
  const season = currentSeason(datePartsInTimeZone(new Date(), tz).month);

  // valueFirst：数字放在图标和标签之间。「篇文章 63」这种量词在前的写法不通，
  // 改成「63 篇文章」；「总浏览量 19,204」本来就顺，保持原样。
  const stats = [
    { label: '总浏览量', value: archiveStats?.total_views, icon: 'fa-regular fa-eye', valueFirst: false },
    { label: '篇文章', value: archiveStats?.post_count, icon: 'fa-regular fa-file-lines', valueFirst: true },
    { label: '条评论', value: archiveStats?.comment_count, icon: 'fa-regular fa-comment', valueFirst: true },
  ].filter((item) => typeof item.value === 'number' && item.value > 0);

  return (
    <footer ref={footerRef} className="sy-footer">
      <div className="sy-footer-landscape" aria-hidden="true">
        <img src={seasonImageUrl(season)} alt="" loading="lazy" decoding="async" />
        <span className="sy-footer-veil" />
      </div>

      <div className="sy-footer-inner">
        <div className="sy-footer-main">
          <div className="sy-footer-brand">
            <span>© {year}</span>
            <Link prefetch={false} href="/" className="sy-footer-name">{siteName}</Link>
            <span className="sy-footer-rights">版权所有</span>
          </div>

          {footerItems.length > 0 && (
            <nav className="sy-footer-links" aria-label="页脚导航">
              {footerItems.map((item) => (
                <Link prefetch={false} key={`${item.href}-${item.label}`} href={item.href || '#'}>{item.label}</Link>
              ))}
            </nav>
          )}

          {stats.length > 0 && (
            <div className="sy-footer-stats">
              {stats.map((item) => {
                const value = <b>{Number(item.value).toLocaleString()}</b>;
                return (
                  <span key={item.label}>
                    <i className={item.icon} aria-hidden="true" />
                    {item.valueFirst ? <>{value}{item.label}</> : <>{item.label}{value}</>}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="sy-footer-legal">
          <p className="sy-footer-meta">
            {site.subtitle || site.description || '山水光影，生活记录'}
            <span aria-hidden="true"> · </span>
            <a href="https://utterlog.com" target="_blank" rel="noopener noreferrer">Utterlog</a>
            <span aria-hidden="true"> · </span>
            主题 ShanYing 移植自「山映」
          </p>
          {isHome && <HomeAuthDock />}
        </div>
      </div>
    </footer>
  );
}
