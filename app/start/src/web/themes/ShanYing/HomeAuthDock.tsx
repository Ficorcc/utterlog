'use client';

/**
 * ShanYing · 页脚右下角的博主入口
 *
 * 原主题没有这个组件 —— WordPress 侧边靠顶部管理条，所以这里没有可复刻的
 * 样式，按 ShanYing 的设计语言自造一颗胶囊：
 *   未登录 → 「登录」（去 /login?next=/admin）
 *   已登录 → 头像 + 昵称，点开向上弹小菜单（后台管理 / 退出登录）
 *
 * 胶囊里只有一个动作。早先版本右侧还挂了一颗独立的「后台」按钮，后来去掉了
 * —— 未登录时它是个死路（点进去会被后台弹回登录页），已登录时又和菜单里的
 * 「后台管理」重复。两个入口收进菜单，胶囊只留「我是谁」这一件事。
 *
 * 2026-09-27 改版：从「固定在视口左下角的浮层」挪进页脚右下角，和页脚
 * 主题署名、访客状态处于同一区域，跟着页脚一起滚动。挂载点也从 HomePage 移到 Footer，
 * 因而在所有使用 ShanYing 全局布局的页面显示。
 *
 * 2026-11-06 弹出方向改版：菜单改为**向右弹出**（bottom 与按钮对齐），不再
 * 遮住页脚上方的行。实现上用 Portal 挂到 body + JS 计算 fixed 定位 —— 页脚
 * 有 overflow:hidden（向右弹会被裁切）和 isolation:isolate（内部 z-index 压
 * 不过右下角 z-54 的回到顶部按钮），CSS 定位在这两个限制下无解：
 *   - fixed 定位 + 先渲染后用 useLayoutEffect 量测（菜单与按钮 rect 均可测），
 *     left 夹在视口右缘内（贴边时自动改为「右对齐视口」），top 保证 ≥ 12px；
 *   - Portal 挂 body 后菜单脱离页脚层叠上下文，z-index 60 稳压回到顶部按钮；
 *   - 滚动/改窗口尺寸时直接收起，避免 fixed 菜单与按钮脱节。
 */

import Link from '@/components/AppLink';
import { useAuthStore } from '@/lib/store';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

/* 水合守卫。注意**不能**拿 `persist.hasHydrated()` 当 useState 的初始值：
   zustand/persist 对 localStorage 是**同步**水合（`toThenable` 遇到同步 storage
   会当场回调），所以客户端首帧 `hasHydrated()` 就已经是 true，胶囊会立刻渲染；
   而服务端读不到 localStorage，SSR 渲染的是 `null` —— 两边对不上，React 报
   hydration mismatch（生产环境 minified 后就是 #418，实测复现过）。
   正确做法：首帧一律 `null`，挂载后（effect）再显示。胶囊是 fixed 定位，
   晚一帧出现不会顶动布局，也不会有可见闪烁。 */
export default function HomeAuthDock() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>(undefined);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // 向右弹出：位置按按钮 rect 计算，横向夹在视口内，纵向与按钮底对齐
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(undefined);
      return;
    }
    const btn = dockRef.current?.querySelector('.sy-auth-user');
    const menu = menuRef.current;
    if (!btn || !menu) return;
    const rect = btn.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let left = rect.right + 10;
    if (left + mw > window.innerWidth - 12) left = Math.max(12, window.innerWidth - mw - 12);
    let top = rect.bottom - mh;
    if (top < 12) top = 12;
    setMenuStyle({ position: 'fixed', left: Math.round(left), top: Math.round(top), bottom: 'auto' });
  }, [open]);

  // 弹出层：点外部或按 Esc 收起；滚动 / 改窗口尺寸时也收起（fixed 菜单会与按钮脱节）
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dockRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  if (!hydrated) return null;

  const name = user?.nickname || user?.username || '博主';
  const avatar = user?.avatar || '';

  const menu =
    user && open ? (
      <div
        ref={menuRef}
        className="sy-auth-menu"
        style={menuStyle}
        role="menu"
        aria-label="账号"
      >
        <Link prefetch={false} className="sy-auth-menu-item" role="menuitem" href="/admin">
          <i className="fa-solid fa-gauge" aria-hidden="true" />
          后台管理
        </Link>
        <button
          type="button"
          className="sy-auth-menu-item"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            logout();
          }}
        >
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
          退出登录
        </button>
      </div>
    ) : null;

  return (
    <div className="sy-auth-dock" ref={dockRef} data-open={open ? '1' : undefined}>
      {user ? (
        <div className="sy-auth-account">
          <button
            type="button"
            className="sy-auth-item sy-auth-user"
            aria-haspopup="menu"
            aria-expanded={open}
            title={`${name} · 已登录`}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sy-auth-avatar" aria-hidden="true">
              {avatar ? <img src={avatar} alt="" /> : <b>{name.slice(0, 1)}</b>}
            </span>
            <span className="sy-auth-label">{name}</span>
            <i className="fa-solid fa-angle-right sy-auth-caret" aria-hidden="true" />
          </button>
          {menu && createPortal(menu, document.body)}
        </div>
      ) : (
        <Link prefetch={false} className="sy-auth-item" href="/login?next=/admin" title="登录后进入后台">
          <i className="fa-regular fa-user" aria-hidden="true" />
          <span className="sy-auth-label">登录</span>
        </Link>
      )}
    </div>
  );
}
