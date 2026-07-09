import { createServerFn } from '@tanstack/react-start';
import { loadHomePageData } from '@/lib/home-page-data';
import { getThemeContextData } from '@/lib/theme-data';
import type { ThemeContextData } from '@/lib/theme-context';
import { dataOf, fetchJson } from './api';

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
  const [themeCtx, homeData, optionsRes, postsRes, categoriesRes, commentsRes] = await Promise.all([
    safe(getThemeContextData(), null),
    safe(loadHomePageData(1), null),
    safe(fetchJson('/options'), { data: {} }),
    safe(fetchJson('/posts?page=1&per_page=8&status=publish'), { data: [] }),
    safe(fetchJson('/categories'), { data: [] }),
    safe(fetchJson('/comments?per_page=8&status=approved&exclude_admin=1'), { data: [] }),
  ]);

  return {
    options: dataOf<Record<string, string>>(optionsRes, {}),
    posts: homeData?.posts || dataOf<any[]>(postsRes, []),
    page: homeData?.page || 1,
    totalPages: homeData?.totalPages || 1,
    categories: homeData?.categories || dataOf<any[]>(categoriesRes, []),
    archiveStats: homeData?.archiveStats || {},
    latestMoment: homeData?.latestMoment || null,
    latestComments: homeData?.latestComments || dataOf<any[]>(commentsRes, []),
    perPage: homeData?.perPage || 8,
    ctx: themeCtx,
  };
});
