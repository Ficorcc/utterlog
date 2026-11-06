'use client';

import Link from '@/components/AppLink';
import { useAuthStore } from '@/lib/store';
import { useEffect, useState } from 'react';

/**
 * 后台入口图标（对齐 vii.ink 侧栏底部第四颗 person 图标）。
 * 未登录 → /login?next=/admin；已登录 → /admin。
 *
 * 水合守卫：zustand/persist 在客户端首帧就同步读到 localStorage，而 SSR 读不到，
 * 直接渲染会造成 hydration mismatch，所以首帧一律按「未登录」渲染，挂载后再纠正。
 */
export default function AdminEntry() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const authed = mounted && isAuthenticated;

  return (
    <Link
      className="wh-icon-btn"
      href={authed ? '/admin' : '/login?next=/admin'}
      prefetch={false}
      aria-label={authed ? '后台管理' : '后台登录'}
      title={authed ? '后台管理' : '后台登录'}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5.5 19.5c.8-3.2 3.4-4.8 6.5-4.8s5.7 1.6 6.5 4.8" />
      </svg>
    </Link>
  );
}
