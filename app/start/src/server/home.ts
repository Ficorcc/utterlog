import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import type { ThemeContextData } from '@/lib/theme-context';
import { getVisitorWeather, loadHomePageDataDirect } from '../../../server/src/public-read';
import { loadStartThemeContextDirect } from './theme';

type HomeResponse = {
  posts: any[];
  page: number;
  totalPages: number;
  categories: any[];
  archiveStats: Record<string, any>;
  latestMoment: any | null;
  latestComments: any[];
  perPage: number;
  options: Record<string, string>;
  ctx: ThemeContextData | null;
};

async function safe<T>(promise: Promise<T>, fallback: T, ms = 1500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch(() => fallback),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const loadStartHome = createServerFn({ method: 'GET' }).handler(async (): Promise<HomeResponse> => {
  const ip = getRequestHeader('cf-connecting-ip')
    || getRequestHeader('x-real-ip')
    || getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim()
    || '127.0.0.1';
  const [themeCtx, homeData, visitorWeather] = await Promise.all([
    safe(loadStartThemeContextDirect(), null),
    safe(loadHomePageDataDirect(1), null),
    safe(getVisitorWeather(ip), null, 1200),
  ]);
  if (themeCtx) themeCtx.visitorWeather = visitorWeather;

  return {
    options: homeData?.options || themeCtx?.options || {},
    posts: homeData?.posts || [],
    page: homeData?.page || 1,
    totalPages: homeData?.totalPages || 1,
    categories: homeData?.categories || themeCtx?.categories || [],
    archiveStats: homeData?.archiveStats || themeCtx?.archiveStats || {},
    latestMoment: homeData?.latestMoment || null,
    latestComments: homeData?.latestComments || [],
    perPage: homeData?.perPage || 10,
    ctx: themeCtx,
  };
});
