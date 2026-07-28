import { notFound } from '@tanstack/react-router';
import { publicPageMeta } from './public-meta';
import {
  loadStartPublicPage,
  type PublicPageData,
  type PublicPageRequest,
} from '../server/public-pages';

/**
 * 公开页的统一取数入口。
 *
 * `preload` 来自路由 loader 的同名参数（TanStack Router 在预取时置为 true）。
 * 一路透传到服务端，只为了让预取不计入全站浏览量 —— 鼠标划过链接不等于看了
 * 一篇文章。数据本身不受影响，预取拿到的和真实导航拿到的是同一份。
 */
export async function loadPublicPage(request: PublicPageRequest, preload = false) {
  const data = await loadStartPublicPage({ data: { ...request, preload } });
  if (data.kind === 'not-found') throw notFound();
  return data;
}

export function publicRouteNumber(value: string, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw notFound();
  return parsed;
}

export function publicPageHead(data: PublicPageData | undefined) {
  if (!data || data.kind === 'not-found') return {};
  const meta = publicPageMeta(data);
  return {
    meta: [
      { title: meta.title },
      ...(meta.description ? [{ name: 'description', content: meta.description }] : []),
    ],
  };
}
