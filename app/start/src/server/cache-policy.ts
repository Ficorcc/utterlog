import { parsePermalinkPath } from '@backend/services/permalink';

export function isVisitorPersonalizedPage(_pathname: string) {
  return false;
}

// 公开内容页：对所有匿名访客渲染结果一致，可交给网关短期缓存。
// 访客天气、在线人数和访问统计都在浏览器端单独请求，不再阻塞 SSR。
const PUBLIC_CACHEABLE_EXACT = new Set([
  '/',
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
  '/page/',
  '/categories/', // 分类归档
  '/tags/', // 标签归档
  '/date/', // 日期归档
  '/films/', // 影视详情（不计阅读量）
];

/**
 * 文章详情页也可以短缓存：阅读量已经移到浏览器 /track 成功上报后记录，
 * 命中 HTML 缓存不会漏计真实访问。
 */
export function isPostDetailPath(pathname: string, permalinkStructure: string) {
  if (!permalinkStructure) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  if (PUBLIC_CACHEABLE_EXACT.has(path)) return false;
  return parsePermalinkPath(path, permalinkStructure) !== null;
}

export function isPublicCacheablePage(pathname: string, permalinkStructure = '') {
  if (isVisitorPersonalizedPage(pathname)) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  if (PUBLIC_CACHEABLE_EXACT.has(path)) return true;
  if (isPostDetailPath(path, permalinkStructure)) return true;
  return PUBLIC_CACHEABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
