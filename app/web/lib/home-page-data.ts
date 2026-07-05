import { getPosts, getOptions, getCategories, getArchiveStats, getMoments, getComments } from './blog-api';

export type HomePageData = {
  posts: any[];
  page: number;
  totalPages: number;
  categories: any[];
  archiveStats: Record<string, unknown>;
  latestMoment: any | null;
  latestComments: any[];
  perPage: number;
};

export async function loadHomePageData(page: number): Promise<HomePageData> {
  let perPage = 10;
  try {
    const opts = await getOptions();
    const data = opts.data || opts;
    perPage = Number(data.posts_per_page) || 10;
  } catch { /* keep defaults */ }

  let posts: any[] = [];
  let totalPages = 1;
  let categories: any[] = [];
  let archiveStats: Record<string, unknown> = {};
  let latestMoment: any | null = null;
  let latestComments: any[] = [];

  try {
    const [postsRes, catsRes, statsRes, momentsRes, commentsRes] = await Promise.all([
      getPosts({ page, per_page: perPage, status: 'publish' }),
      getCategories(),
      getArchiveStats(),
      getMoments({ per_page: 1 }),
      getComments({ per_page: 60, status: 'approved', exclude_admin: 1 }),
    ]);
    posts = (postsRes.data || []).filter((p: any) => p.id != null && p.title);
    totalPages = postsRes.meta?.total_pages || 1;
    categories = catsRes.data || [];
    archiveStats = statsRes.data || {};
    const moments = momentsRes.data?.moments || momentsRes.data || [];
    latestMoment = moments[0] || null;
    latestComments = commentsRes.data?.comments || commentsRes.data || [];
  } catch { /* keep empty */ }

  return { posts, page, totalPages, categories, archiveStats, latestMoment, latestComments, perPage };
}
