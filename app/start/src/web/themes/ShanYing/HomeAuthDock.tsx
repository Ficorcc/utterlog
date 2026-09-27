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
 * 法务行（「在路上的思绪与脚印 · Utterlog · 主题 ShanYing 移植自「山映」」）
 * 同一排、右对齐，跟着页脚一起滚动。挂载点也从 HomePage 移到 Footer，
 * 但用 usePathname() 守住「只在首页出现」这个原有范围。
 *
 * 位置沿革（留着，免得以后又踩）：头部胶囊占了顶部（fixed top:18 居中），
 * 返回顶部占了右下（right:26 / bottom:26），文章页的阅读工具条占了下缘中间
 * （left:50% / bottom:22）—— 当初左下角是唯一常年空着的角，所以浮层放那儿。
 * 现在收进页脚，这些都不冲突了。
 */

import Link from '@/components/AppLink';
import { useAuthStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    setHydrated(true);
  }, []);

  // 弹出层：点外部或按 Esc 收起
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!hydrated) return null;

  const name = user?.nickname || user?.username || '博主';
  const avatar = user?.avatar || '';

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
            <i className="fa-solid fa-angle-up sy-auth-caret" aria-hidden="true" />
          </button>

          {open && (
            <div className="sy-auth-menu" role="menu" aria-label="账号">
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
          )}
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
