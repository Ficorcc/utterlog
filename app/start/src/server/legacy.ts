import { createServerFn } from '@tanstack/react-start';
import {
  getBooks,
  getFootprints,
  getGames,
  getGoods,
  getMoments,
  getMovies,
  getMusicList,
  getOptions,
  getPosts,
  searchPosts,
} from '@/lib/blog-api';
import { loadHomePageData } from '@/lib/home-page-data';
import { resolvePostFromPermalink } from '@/lib/permalink-resolve';
import { getThemeContextData } from '@/lib/theme-data';
import type { ThemeContextData } from '@/lib/theme-context';
import { datePartsInTimeZone, resolveSiteTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import { dataOf, fetchJson } from './api';

type LegacyInput = {
  pathname: string;
  search?: Record<string, string | undefined>;
};

const API_WAIT_MS = 1500;

export type StartLegacyRouteData =
  | { kind: 'not-found'; ctx: ThemeContextData | null; pathname: string }
  | { kind: 'home'; ctx: ThemeContextData | null; posts: any[]; page: number; totalPages: number; categories: any[]; archiveStats: Record<string, any>; latestMoment: any | null; latestComments: any[]; perPage: number }
  | { kind: 'post'; ctx: ThemeContextData | null; post: any; options: Record<string, string> }
  | { kind: 'archives'; ctx: ThemeContextData; posts: any[] }
  | { kind: 'categories'; ctx: ThemeContextData }
  | { kind: 'category'; ctx: ThemeContextData; category: any; posts: any[] }
  | { kind: 'tags'; ctx: ThemeContextData }
  | { kind: 'tag'; ctx: ThemeContextData; tag: any; posts: any[] }
  | { kind: 'footprints'; ctx: ThemeContextData | null; rows: any[]; options: Record<string, string> }
  | { kind: 'moments'; ctx: ThemeContextData | null; moments: any[]; tags: string[]; fetchedAt: number }
  | { kind: 'client'; ctx: ThemeContextData | null; page: 'links' | 'feeds' | 'albums' | 'music'; items?: any[] }
  | { kind: 'shelf'; ctx: ThemeContextData | null; shelf: 'movies' | 'books' | 'games' | 'goods'; items: any[] }
  | { kind: 'search'; ctx: ThemeContextData | null; query: string; results: any[]; mode: string; total: number; timeZone: string }
  | { kind: 'films'; ctx: ThemeContextData | null; items: any[]; total: number; page: number; perPage: number; totalPages: number; filters: Record<string, string> }
  | { kind: 'date'; ctx: ThemeContextData | null; posts: any[]; year: number; month?: number; day?: number; timeZone: string };

function normalizePath(pathname: string) {
  const raw = pathname || '/';
  const pathOnly = raw.split('?')[0] || '/';
  return pathOnly.replace(/\/+$/, '') || '/';
}

function normalizeText(input: string, lower = false) {
  let value = input;
  try { value = decodeURIComponent(value); } catch {}
  value = value.normalize('NFC').trim();
  return lower ? value.toLowerCase() : value;
}

function matchBySlugOrName(items: any[], slug: string, lower = false) {
  const needle = normalizeText(slug, lower);
  return items.find((item: any) => (
    normalizeText(String(item?.slug || ''), lower) === needle ||
    normalizeText(String(item?.name || ''), lower) === needle
  ));
}

async function safe<T>(promise: Promise<T>, fallback: T, ms = API_WAIT_MS): Promise<T> {
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

function momentTags(moments: any[]) {
  const seen = new Set<string>();
  for (const item of moments) {
    const mood = String(item?.mood || '').trim();
    if (mood) seen.add(mood);
    if (seen.size >= 8) break;
  }
  return Array.from(seen);
}

function pageNumber(search?: Record<string, string | undefined>) {
  return Math.max(1, parseInt(String(search?.page || '1'), 10) || 1);
}

async function themeCtx() {
  return safe(getThemeContextData(), null);
}

async function optionsFallback() {
  const res = await safe(getOptions(), { data: {} });
  return dataOf<Record<string, string>>(res, {});
}

async function postBySlug(slug: string) {
  const res = await safe(fetchJson(`/posts/slug/${encodeURIComponent(slug)}?track=1`), { data: null });
  return dataOf<any | null>(res, null);
}

async function homeRoute(ctx: ThemeContextData | null, page: number): Promise<StartLegacyRouteData> {
  const home = await safe(loadHomePageData(page), null);
  return {
    kind: 'home',
    ctx,
    posts: home?.posts || [],
    page: home?.page || page,
    totalPages: home?.totalPages || 1,
    categories: home?.categories || ctx?.categories || [],
    archiveStats: home?.archiveStats || ctx?.archiveStats || {},
    latestMoment: home?.latestMoment || null,
    latestComments: home?.latestComments || [],
    perPage: home?.perPage || 10,
  };
}

async function dateRoute(ctx: ThemeContextData | null, year: number, month?: number, day?: number): Promise<StartLegacyRouteData> {
  const options = ctx?.options || await optionsFallback();
  const timeZone = ctx?.timeZone || resolveSiteTimeZone(options);
  const res = await safe(getPosts({ per_page: 500, status: 'publish' }), { data: [] });
  const posts = dataOf<any[]>(res, []).filter((post) => {
    const parts = datePartsInTimeZone(postDateInput(post), timeZone);
    return parts.year === year && (month == null || parts.month === month) && (day == null || parts.day === day);
  });
  return { kind: 'date', ctx, posts, year, month, day, timeZone };
}

export const loadStartLegacyRoute = createServerFn({ method: 'GET' })
  .validator((input: LegacyInput) => input)
  .handler(async ({ data }): Promise<StartLegacyRouteData> => {
    const pathname = normalizePath(data.pathname);
    const search = data.search || {};
    const ctx = await themeCtx();

    if (pathname === '/') return homeRoute(ctx, 1);

    let match = pathname.match(/^\/page\/(\d+)$/);
    if (match) return homeRoute(ctx, Math.max(1, parseInt(match[1], 10) || 1));

    match = pathname.match(/^\/posts\/([^/]+)$/);
    if (match) {
      const post = await postBySlug(decodeURIComponent(match[1]));
      if (!post) return { kind: 'not-found', ctx, pathname };
      return { kind: 'post', ctx, post, options: ctx?.options || await optionsFallback() };
    }

    match = pathname.match(/^\/films\/([^/]+)$/);
    if (match) {
      const post = await postBySlug(decodeURIComponent(match[1]));
      if (!post) return { kind: 'not-found', ctx, pathname };
      return { kind: 'post', ctx, post, options: ctx?.options || await optionsFallback() };
    }

    if (pathname === '/archives') {
      if (!ctx) return { kind: 'not-found', ctx, pathname };
      const res = await safe(getPosts({ per_page: 500, status: 'publish' }), { data: [] });
      return { kind: 'archives', ctx, posts: dataOf<any[]>(res, []) };
    }

    if (pathname === '/categories') {
      if (!ctx) return { kind: 'not-found', ctx, pathname };
      return { kind: 'categories', ctx };
    }
    match = pathname.match(/^\/categories\/([^/]+)$/);
    if (match) {
      if (!ctx) return { kind: 'not-found', ctx, pathname };
      const category = matchBySlugOrName(ctx.categories, match[1]);
      if (!category) return { kind: 'not-found', ctx, pathname };
      const res = await safe(getPosts({ per_page: 500, category_id: category.id, status: 'publish' }), { data: [] });
      return { kind: 'category', ctx, category, posts: dataOf<any[]>(res, []) };
    }

    if (pathname === '/tags') {
      if (!ctx) return { kind: 'not-found', ctx, pathname };
      return { kind: 'tags', ctx };
    }
    match = pathname.match(/^\/tags\/([^/]+)$/);
    if (match) {
      if (!ctx) return { kind: 'not-found', ctx, pathname };
      const tag = matchBySlugOrName(ctx.tags, match[1], true);
      if (!tag) return { kind: 'not-found', ctx, pathname };
      const res = await safe(getPosts({ per_page: 500, tag_id: tag.id, status: 'publish' }), { data: [] });
      return { kind: 'tag', ctx, tag, posts: dataOf<any[]>(res, []) };
    }

    if (pathname === '/search') {
      const query = String(search.q || '').trim();
      const options = ctx?.options || await optionsFallback();
      const timeZone = ctx?.timeZone || resolveSiteTimeZone(options);
      if (!query) return { kind: 'search', ctx, query, results: [], mode: '', total: 0, timeZone };
      const res = await safe(searchPosts(query, 20), { data: { results: [] } });
      const body = dataOf<any>(res, {});
      const results = body.results || [];
      return { kind: 'search', ctx, query, results, mode: body.mode || '', total: body.total || results.length, timeZone };
    }

    if (pathname === '/footprints') {
      const [options, footprints] = await Promise.all([
        optionsFallback(),
        safe(getFootprints(), { data: [] }),
      ]);
      return { kind: 'footprints', ctx, rows: dataOf<any[]>(footprints, []), options };
    }

    if (pathname === '/moments') {
      const res = await safe(getMoments({ per_page: 50 }), { data: [] });
      const body = dataOf<any>(res, []);
      const moments = Array.isArray(body) ? body : body.moments || [];
      return { kind: 'moments', ctx, moments, tags: momentTags(moments), fetchedAt: Date.now() };
    }

    if (pathname === '/links') return { kind: 'client', ctx, page: 'links' };
    if (pathname === '/feeds') return { kind: 'client', ctx, page: 'feeds' };
    if (pathname === '/albums') return { kind: 'client', ctx, page: 'albums' };
    if (pathname === '/music') {
      const res = await safe(getMusicList({ per_page: 100 }), { data: [] });
      return { kind: 'client', ctx, page: 'music', items: dataOf<any[]>(res, []) };
    }

    if (pathname === '/movies') {
      const res = await safe(getMovies({ per_page: 60 }), { data: [] });
      return { kind: 'shelf', ctx, shelf: 'movies', items: dataOf<any[]>(res, []) };
    }
    if (pathname === '/books') {
      const res = await safe(getBooks({ per_page: 60 }), { data: [] });
      return { kind: 'shelf', ctx, shelf: 'books', items: dataOf<any[]>(res, []) };
    }
    if (pathname === '/games') {
      const res = await safe(getGames({ per_page: 60 }), { data: [] });
      return { kind: 'shelf', ctx, shelf: 'games', items: dataOf<any[]>(res, []) };
    }
    if (pathname === '/goods') {
      const res = await safe(getGoods({ per_page: 60 }), { data: [] });
      return { kind: 'shelf', ctx, shelf: 'goods', items: dataOf<any[]>(res, []) };
    }

    if (pathname === '/films') {
      const page = pageNumber(search);
      const perPage = 24;
      const filters = {
        video_type: String(search.video_type || ''),
        year: String(search.year || ''),
        region: String(search.region || ''),
      };
      const res = await safe(getPosts({
        type: 'video',
        page,
        per_page: perPage,
        video_type: filters.video_type || undefined,
        year: filters.year || undefined,
        region: filters.region || undefined,
      }), { data: [] });
      const items = dataOf<any[]>(res, []);
      const total = (res as any)?.pagination?.total ?? (res as any)?.total ?? items.length;
      return { kind: 'films', ctx, items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)), filters };
    }

    match = pathname.match(/^\/date\/(\d{4})(?:\/(\d{2})(?:\/(\d{2}))?)?$/);
    if (match) {
      return dateRoute(ctx, Number(match[1]), match[2] ? Number(match[2]) : undefined, match[3] ? Number(match[3]) : undefined);
    }

    const segments = pathname.split('/').filter(Boolean).map((item) => decodeURIComponent(item));
    if (segments.length > 0) {
      const post = await safe(resolvePostFromPermalink(segments, true), null);
      if (post) return { kind: 'post', ctx, post, options: ctx?.options || await optionsFallback() };
    }

    return { kind: 'not-found', ctx, pathname };
  });
