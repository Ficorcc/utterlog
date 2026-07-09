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

export const loadStartHome = createServerFn({ method: 'GET' }).handler(async (): Promise<HomeResponse> => {
  const [themeCtx, homeData, optionsRes, postsRes, categoriesRes, commentsRes] = await Promise.all([
    getThemeContextData().catch(() => null),
    loadHomePageData(1).catch(() => null),
    fetchJson('/options').catch(() => ({ data: {} })),
    fetchJson('/posts?page=1&per_page=8&status=publish').catch(() => ({ data: [] })),
    fetchJson('/categories').catch(() => ({ data: [] })),
    fetchJson('/comments?per_page=8&status=approved&exclude_admin=1').catch(() => ({ data: [] })),
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
