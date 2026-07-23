export function isVisitorPersonalizedPage(pathname: string) {
  return pathname === '/' || /^\/page\/\d+\/?$/.test(pathname);
}

// 公开内容页：对所有匿名访客渲染结果一致，可交给 CDN 短期缓存。
// 首页 `/` 与 `/page/N` 因含访客个性化（天气等）不在此列，由
// isVisitorPersonalizedPage 单独打 no-store。
const PUBLIC_CACHEABLE_EXACT = new Set([
  '/about',
  '/coding',
  '/moments',
  '/footprints',
  '/albums',
  '/music',
  '/movies',
  '/films',
  '/books',
  '/goods',
  '/games',
  '/links',
  '/feeds',
  '/archives',
  '/categories',
  '/tags',
]);

const PUBLIC_CACHEABLE_PREFIXES = [
  '/archives/', // 文章详情
  '/categories/', // 分类归档
  '/tags/', // 标签归档
  '/date/', // 日期归档
  '/films/', // 影视详情
];

export function isPublicCacheablePage(pathname: string) {
  if (isVisitorPersonalizedPage(pathname)) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  if (PUBLIC_CACHEABLE_EXACT.has(path)) return true;
  return PUBLIC_CACHEABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
