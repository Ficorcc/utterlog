import { notFound } from '@tanstack/react-router';
import { publicPageMeta } from './public-meta';
import {
  loadStartPublicPage,
  type PublicPageData,
  type PublicPageRequest,
} from '../server/public-pages';

export async function loadPublicPage(request: PublicPageRequest) {
  const data = await loadStartPublicPage({ data: request });
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
