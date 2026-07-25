import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Admin is served under /admin, so the router matches with that basepath.
// SPA mode (see vite.config.ts) — no SSR, the client router owns navigation
// once the prerendered shell hydrates.
export function getRouter() {
  return createRouter({
    routeTree,
    basepath: '/admin',
    // 鼠标移到侧边栏链接上就预取该页的 chunk 和 loader 数据。关掉的话，每次
    // 点击才开始下载 —— chunk 本身只有几 KB，但一个往返在跨境链路上要 0.5s+，
    // 这半秒是实打实的等待。hover 到点击之间通常有 100~300ms，足够把请求发出去。
    defaultPreload: 'intent',
    // 预取结果缓存 30 秒：同一个页面来回切不重复请求，超时后再拉保证数据不过期。
    defaultPreloadStaleTime: 30_000,
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
