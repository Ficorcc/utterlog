'use client';

/**
 * ShanYing · Footer
 *
 * 原主题页脚 = 一张横向山水图 + 版权行 + 备案行。Utterlog 没有备案设置，
 * 这里把备案位替换成站点统计（总浏览 / 文章 / 评论）与访客状态，
 * 保留「图在上、信息在下」的版式与间距。
 *
 * 2026-09-27 调整：
 *   - 去掉页脚导航里的 RSS 链接（订阅入口已在别处，页脚不再重复）
 *   - 去掉 owner.bio 那一行
 *   - 统计项改成「图标 · 数字 · 标签」的顺序，数字紧跟图标
 *   - 博主入口（HomeAuthDock）从首页左下角浮层挪到 legal 行右侧，
 *     在所有页面的统一页脚中显示
 */

import Link from '@/components/AppLink';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useThemeContext } from '@/lib/theme-context';
import { resolveSiteTimeZone } from '@/lib/timezone';
import { resolveScene, sceneImageUrl, sceneImageSmallUrl } from './shanying-scene';
import { hourInTimeZone } from './shanying-shared';
import HomeAuthDock from './HomeAuthDock';

type FooterStatus = {
  count: number;
  enabled: boolean;
  latest: { country_code: string; country: string; region: string; city: string } | null;
};

type OnlineVisitor = {
  visitor_id?: string;
  name?: string;
  avatar?: string;
  country?: string;
  country_code?: string;
  city?: string;
};

function flagEmoji(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '';
  return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
}

function FooterPresence() {
  const [status, setStatus] = useState<FooterStatus | null>(null);
  const [visitors, setVisitors] = useState<OnlineVisitor[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/v1/online?summary=1', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload?.data) setStatus(payload.data);
      } catch {
        // Keep the last successful status when a refresh fails.
      }
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const loadVisitors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/online', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const data = payload?.data || payload;
      setVisitors(Array.isArray(data?.online) ? data.online : []);
      setStatus((current) => current ? { ...current, count: Number(data?.count || 0), enabled: data?.enabled !== false } : current);
    } catch {
      // Keep the last successful list when a refresh fails.
    } finally {
      setLoading(false);
    }
  };

  const toggleVisitors = () => {
    const next = !open;
    setOpen(next);
    if (next) void loadVisitors();
  };

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    panelRef.current.style.left = `${Math.max(12, Math.min(trigger.left + trigger.width / 2 - panel.width / 2, window.innerWidth - panel.width - 12))}px`;
    panelRef.current.style.top = `${Math.max(12, trigger.top - panel.height - 10)}px`;
  }, [open, loading, visitors]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const node = event.target as Node;
      if (!triggerRef.current?.contains(node) && !panelRef.current?.contains(node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnViewportChange);
    document.querySelector('.blog-main')?.addEventListener('scroll', closeOnViewportChange, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnViewportChange);
      document.querySelector('.blog-main')?.removeEventListener('scroll', closeOnViewportChange);
    };
  }, [open]);

  if (!status?.enabled) return <span className="sy-footer-presence-slot" aria-hidden="true" />;
  const latest = status.latest;
  const locationParts = [latest?.region, latest?.city].map((part) => String(part || '').trim()).filter(Boolean);
  const location = [...new Set(locationParts)].join(' · ') || latest?.country || '';
  const flag = flagEmoji(latest?.country_code || '');

  return (
    <div className="sy-footer-presence" aria-label="站点访客状态">
      <button
        ref={triggerRef}
        type="button"
        className="sy-footer-presence-online"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggleVisitors}
      >
        <i className="sy-footer-presence-dot" aria-hidden="true" />
        {status.count} 人在线
        <i className={`fa-solid fa-chevron-${open ? 'down' : 'up'} sy-footer-presence-chevron`} aria-hidden="true" />
      </button>
      {location && (
        <span className="sy-footer-presence-location">
          <i className="fa-solid fa-location-dot" aria-hidden="true" />
          最近访客来自
          {flag && <span className="sy-footer-presence-flag" aria-hidden="true">{flag}</span>}
          <span>{location}</span>
        </span>
      )}
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={panelRef} className="sy-footer-online-panel" role="dialog" aria-label="当前在线访客">
          <header>
            <span><i className="sy-footer-presence-dot" aria-hidden="true" />当前在线</span>
            <small>{visitors.length} 人</small>
          </header>
          <div className="sy-footer-online-list">
            {loading && visitors.length === 0 ? (
              <p className="sy-footer-online-empty">正在加载…</p>
            ) : visitors.length === 0 ? (
              <p className="sy-footer-online-empty">暂无在线访客</p>
            ) : visitors.map((visitor, index) => {
              const name = String(visitor.name || '').trim() || `匿名访客 ${index + 1}`;
              const place = [...new Set([visitor.country, visitor.city].map((part) => String(part || '').trim()).filter(Boolean))].join(' · ');
              const visitorFlag = flagEmoji(visitor.country_code || '');
              return (
                <div className="sy-footer-online-visitor" key={visitor.visitor_id || `${name}-${index}`}>
                  {visitor.avatar ? (
                    <img src={visitor.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="sy-footer-online-avatar" aria-hidden="true"><i className="fa-solid fa-user" /></span>
                  )}
                  <span className="sy-footer-online-info">
                    <strong>{name}</strong>
                    <small>{visitorFlag && <span aria-hidden="true">{visitorFlag} </span>}{place || '正在浏览本站'}</small>
                  </span>
                  <i className="sy-footer-online-dot" aria-label="在线" />
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function Footer() {
  const { site, menus, archiveStats, options, timeZone } = useThemeContext();
  const footerRef = useRef<HTMLElement>(null);
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

  // Use the same site timezone and scene override as the homepage Hero.
  const tz = timeZone || resolveSiteTimeZone(options);
  const scene = resolveScene(options?.shanying_scene, hourInTimeZone(tz));

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
        <img src={sceneImageUrl(scene)} srcSet={`${sceneImageSmallUrl(scene)} 1280w, ${sceneImageUrl(scene)} 1774w`} sizes="(min-width: 1048px) 1000px, calc(100vw - 48px)" alt="" loading="lazy" decoding="async" />
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
            <a href="https://utterlog.com" target="_blank" rel="noopener noreferrer">Utterlog</a>
            <span aria-hidden="true"> · </span>
            主题 ShanYing 移植自「山映」
          </p>
          <FooterPresence />
          <HomeAuthDock />
        </div>
      </div>
    </footer>
  );
}
