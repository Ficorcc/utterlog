import { createHash } from 'node:crypto';
import { table } from './config';
import { exec, intParam, many, nowUnix, one } from './db/helpers';
import { optionValue } from './db/options';
import { parsePermalinkPath } from './services/permalink';

type MetaType = 'category' | 'tag';
type PublicContentTable = 'albums' | 'books' | 'games' | 'goods' | 'links' | 'movies' | 'music' | 'playlists';

type PublicPostListParams = {
  page?: number;
  perPage?: number;
  status?: string;
  type?: string;
  search?: string;
  category?: string;
  categoryId?: number;
  tag?: string;
  tagId?: number;
  videoType?: string;
  region?: string;
  year?: string;
  genre?: string;
  orderBy?: string;
  order?: string;
  authed?: boolean;
};

function normalizeOrder(input: string | undefined, fallback: string) {
  const allowed = new Set(['id', 'created_at', 'updated_at', 'published_at', 'display_id', 'view_count', 'comment_count', 'title', 'name', 'order_num', 'sort_order', 'random']);
  return input && allowed.has(input) ? input : fallback;
}

function normalizeDirection(input: string | undefined) {
  return input?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}

function commentGeoFromRow(value: unknown) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function gravatarUrlForEmail(email: string, size = 64) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return '';
  const hash = createHash('md5').update(normalized).digest('hex');
  return `https://gravatar.bluecdn.com/avatar/${hash}?s=${size}&d=mp`;
}

function utterlogAvatarUrlForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return '';
  const hash = createHash('md5').update(normalized).digest('hex');
  return `https://id.utterlog.com/avatar/${hash}`;
}

function stripMarkdownExcerpt(content: string, maxLen = 200) {
  let text = String(content || '');
  while (text.includes('```')) {
    const start = text.indexOf('```');
    const end = text.indexOf('```', start + 3);
    if (end < 0) {
      text = text.slice(0, start);
      break;
    }
    text = `${text.slice(0, start)}${text.slice(end + 3)}`;
  }
  text = text
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '');
  text = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('---') && !line.startsWith('>'))
    .join(' ')
    .trim();
  return [...text].slice(0, maxLen).join('');
}

function sanitizePostForResponse(row: Record<string, unknown>, detail: boolean) {
  const next = { ...row };
  delete next.password;
  next.meta = next.meta || {};
  if (!detail) {
    const aiSummary = String(next.ai_summary || '').trim();
    if (aiSummary) next.excerpt = aiSummary;
    if (!String(next.excerpt || '').trim() && next.content) {
      next.excerpt = stripMarkdownExcerpt(String(next.content || ''), 200);
    }
    delete next.content;
  }
  return next;
}

async function bumpPostView(postId: number) {
  await exec(`update ${table('posts')} set view_count = coalesce(view_count, 0) + 1 where id = $1`, [postId]).catch(() => {});
}

async function ownerPublicPayload(user: Record<string, unknown> | null) {
  if (!user) return {};
  const email = String(user.email || '');
  const profileAvatar = String(user.avatar || '');
  const utterlogAvatar = String(user.utterlog_avatar || '') || utterlogAvatarUrlForEmail(email);
  const gravatarUrl = gravatarUrlForEmail(email, 128);
  const avatarSource = await optionValue('avatar_source', 'auto');
  const ownerAvatarOption = await optionValue('owner_avatar', '');

  let avatar = '';
  switch (avatarSource) {
    case 'profile':
      avatar = profileAvatar;
      break;
    case 'utterlog':
      avatar = utterlogAvatar;
      break;
    case 'gravatar':
      avatar = gravatarUrl;
      break;
    default:
      avatar = profileAvatar || utterlogAvatar || gravatarUrl || ownerAvatarOption;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    nickname: user.nickname,
    bio: user.bio,
    role: user.role,
    url: user.url || '',
    avatar: avatar || null,
    gravatar_url: gravatarUrl,
    utterlog_avatar: utterlogAvatar,
  };
}

async function attachPostRelations(rows: Record<string, unknown>[], detail = false) {
  const ids = rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
  if (ids.length === 0) return rows.map((row) => sanitizePostForResponse(row, detail));
  const metas = await many<Record<string, unknown> & { post_id: number }>(
    `select r.post_id, m.*
     from ${table('relationships')} r
     join ${table('metas')} m on m.id = r.meta_id
     where r.post_id = any($1::int[]) and m.type in ('category', 'tag')
     order by m.type, m.name`,
    [ids],
  ).catch(() => []);
  const byPost = new Map<number, { categories: Record<string, unknown>[]; tags: Record<string, unknown>[] }>();
  for (const meta of metas) {
    const postId = Number(meta.post_id);
    if (!byPost.has(postId)) byPost.set(postId, { categories: [], tags: [] });
    const target = meta.type === 'category' ? byPost.get(postId)!.categories : byPost.get(postId)!.tags;
    const { post_id: _postId, ...clean } = meta;
    target.push(clean);
  }
  return rows.map((row) => {
    const rel = byPost.get(Number(row.id)) || { categories: [], tags: [] };
    return sanitizePostForResponse({ ...row, meta: row.meta || {}, categories: rel.categories, tags: rel.tags }, detail);
  });
}

export async function getOptionsMap() {
  const rows = await many<{ name: string; value: string }>(`select name, value from ${table('options')} order by name asc`).catch(() => []);
  const result: Record<string, string> = {};
  for (const row of rows) result[row.name] = row.value;
  result.site_timezone_effective = result.site_timezone || 'UTC';
  return result;
}

export async function getOwnerPublic() {
  const user = await one<Record<string, unknown>>(
    `select id, username, email, nickname, avatar, bio, url, role, utterlog_avatar
     from ${table('users')} where role = 'admin' order by id asc limit 1`,
  ).catch(() => null);
  return ownerPublicPayload(user);
}

export async function listMetas(type: MetaType, includeEmpty = false) {
  const where = includeEmpty ? 'type = $1' : 'type = $1 and count > 0';
  return many<Record<string, unknown>>(
    `select * from ${table('metas')} where ${where} order by order_num asc, count desc, name asc`,
    [type],
  ).catch(() => []);
}

export async function archiveStatsPayload() {
  const [posts, comments, words, firstPost, accessViews, storedViews, heatmap, archives] = await Promise.all([
    one<{ count: string }>(
      `select count(*)::text as count from ${table('posts')} where status = 'publish' and type = 'post'`,
    ).catch(() => null),
    one<{ count: string }>(
      `select count(*)::text as count from ${table('comments')} where status = 'approved'`,
    ).catch(() => null),
    one<{ total: string }>(
      `select coalesce(sum(coalesce(word_count,0)),0)::text as total
       from ${table('posts')} where status = 'publish' and type = 'post'`,
    ).catch(() => null),
    one<{ first_at: string }>(
      `select coalesce(min(extract(epoch from coalesce(published_at, to_timestamp(created_at)))::bigint), 0)::text as first_at
       from ${table('posts')} where status = 'publish' and type = 'post'`,
    ).catch(() => null),
    one<{ count: string }>(`select count(*)::text as count from ${table('access_logs')}`).catch(() => null),
    one<{ total: string }>(`select coalesce(total_views,0)::text as total from ${table('stats_global')} where id = 1`).catch(() => null),
    many<{ date: string; count: number }>(
      `select to_char(coalesce(published_at, to_timestamp(created_at)), 'YYYY-MM-DD') as date,
              count(*)::int as count
       from ${table('posts')}
       where status = 'publish' and type = 'post'
         and coalesce(published_at, to_timestamp(created_at)) >= now() - interval '1 year'
       group by date
       order by date asc`,
    ).catch(() => []),
    many<{ year: number; month: number; count: number }>(
      `select extract(year from coalesce(published_at, to_timestamp(created_at)))::int as year,
              extract(month from coalesce(published_at, to_timestamp(created_at)))::int as month,
              count(*)::int as count
       from ${table('posts')}
       where status = 'publish' and type = 'post'
       group by year, month
       order by year desc, month desc`,
    ).catch(() => []),
  ]);
  const firstAt = Number(firstPost?.first_at || 0);
  const days = firstAt > 0 ? Math.max(1, Math.ceil((nowUnix() - firstAt) / 86400) + 1) : 0;
  return {
    post_count: Number(posts?.count || 0),
    comment_count: Number(comments?.count || 0),
    word_count: Number(words?.total || 0),
    days,
    total_views: Math.max(Number(accessViews?.count || 0), Number(storedViews?.total || 0)),
    heatmap,
    archives,
  };
}

export async function listPosts(params: PublicPostListParams = {}) {
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(500, Math.max(1, params.perPage || 20));
  const offset = (page - 1) * perPage;
  const typ = params.type || 'post';
  const status = params.authed ? params.status : (params.status || 'publish');
  const where: string[] = ['p.type = $1'];
  const joins: string[] = [];
  const queryParams: unknown[] = [typ];
  if (status) {
    queryParams.push(status);
    where.push(`p.status = $${queryParams.length}`);
  }
  if (params.search) {
    queryParams.push(`%${params.search}%`);
    where.push(`(p.title ilike $${queryParams.length} or coalesce(p.excerpt,'') ilike $${queryParams.length} or coalesce(p.content,'') ilike $${queryParams.length})`);
  }
  const categoryId = intParam(params.categoryId == null ? undefined : String(params.categoryId));
  if (params.category || categoryId > 0) {
    joins.push(`join ${table('relationships')} cr on cr.post_id = p.id join ${table('metas')} cm on cm.id = cr.meta_id and cm.type = 'category'`);
    if (categoryId > 0) {
      queryParams.push(categoryId);
      where.push(`cm.id = $${queryParams.length}`);
    } else {
      queryParams.push(params.category);
      where.push(`cm.slug = $${queryParams.length}`);
    }
  }
  const tagId = intParam(params.tagId == null ? undefined : String(params.tagId));
  if (params.tag || tagId > 0) {
    joins.push(`join ${table('relationships')} tr on tr.post_id = p.id join ${table('metas')} tm on tm.id = tr.meta_id and tm.type = 'tag'`);
    if (tagId > 0) {
      queryParams.push(tagId);
      where.push(`tm.id = $${queryParams.length}`);
    } else {
      queryParams.push(params.tag);
      where.push(`tm.slug = $${queryParams.length}`);
    }
  }
  for (const [value, metaKey] of [[params.videoType, 'video_type'], [params.region, 'region'], [params.year, 'year']] as const) {
    if (value) {
      queryParams.push(value);
      where.push(`p.meta->>'${metaKey}' = $${queryParams.length}`);
    }
  }
  if (params.genre) {
    queryParams.push(JSON.stringify([params.genre]));
    where.push(`p.meta->'genres' @> $${queryParams.length}::jsonb`);
  }
  const orderBy = normalizeOrder(params.orderBy, 'published_at');
  const direction = normalizeDirection(params.order);
  const orderExpr = orderBy === 'random'
    ? 'random()'
    : orderBy === 'published_at'
      ? 'coalesce(p.published_at, to_timestamp(p.created_at))'
      : `p.${orderBy}`;
  const joinSql = joins.length ? ` ${joins.join(' ')}` : '';
  const whereSql = where.length ? `where ${where.join(' and ')}` : '';
  const total = await one<{ count: string }>(`select count(*)::text as count from ${table('posts')} p${joinSql} ${whereSql}`, queryParams).catch(() => null);
  const rows = await many<Record<string, unknown>>(
    `select p.* from ${table('posts')} p${joinSql} ${whereSql}
     order by ${orderExpr} ${orderBy === 'random' ? '' : direction}, p.id ${direction}
     limit $${queryParams.length + 1} offset $${queryParams.length + 2}`,
    [...queryParams, perPage, offset],
  ).catch(() => []);
  const count = Number(total?.count || 0);
  return {
    data: await attachPostRelations(rows),
    meta: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
    pagination: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
  };
}

async function getPublishedPostBy(column: 'id' | 'display_id' | 'slug', value: string | number, track = false, postOnly = false) {
  const typeSql = postOnly ? ` and type = 'post'` : '';
  const post = await one<Record<string, unknown>>(
    `select * from ${table('posts')} where ${column} = $1 and status = 'publish'${typeSql} limit 1`,
    [value],
  ).catch(() => null);
  if (!post || post.status !== 'publish') return null;
  if (track && typeof post.id === 'number') {
    await bumpPostView(post.id);
    post.view_count = Number(post.view_count || 0) + 1;
  }
  const metas = await many<Record<string, unknown>>(
    `select m.* from ${table('relationships')} r join ${table('metas')} m on m.id = r.meta_id where r.post_id = $1 order by m.type, m.name`,
    [post.id],
  ).catch(() => []);
  const episodes = await many<Record<string, unknown>>(
    `select * from ${table('post_episodes')} where post_id = $1 order by sort_order asc, episode_no asc, id asc`,
    [post.id],
  ).catch(() => []);
  const authorUser = post.author_id
    ? await one<Record<string, unknown>>(
      `select id, username, email, nickname, avatar, bio, url, role, utterlog_avatar from ${table('users')} where id = $1`,
      [post.author_id],
    ).catch(() => null)
    : null;
  return sanitizePostForResponse({
    ...post,
    meta: post.meta || {},
    categories: metas.filter((m) => m.type === 'category'),
    tags: metas.filter((m) => m.type === 'tag'),
    episodes,
    author: authorUser ? await ownerPublicPayload(authorUser) : null,
  }, true);
}

export async function getPostBySlug(slug: string, track = false) {
  return getPublishedPostBy('slug', slug, track);
}

export async function resolvePublicPostPath(pathname: string, track = false) {
  const structure = await optionValue('permalink_structure', '/posts/%postname%');
  if (!structure || structure === '/posts/%postname%') return null;
  const target = parsePermalinkPath(pathname, structure);
  if (!target) return null;
  if (target.displayId) return getPublishedPostBy('display_id', target.displayId, track, true);
  if (target.id) return getPublishedPostBy('id', target.id, track, true);
  if (target.slug) return getPublishedPostBy('slug', target.slug, track, true);
  return null;
}

export async function searchPublicPosts(query: string, limit = 20) {
  const term = query.trim();
  if (!term) return { results: [], total: 0, mode: 'keyword' };
  const result = await listPosts({ search: term, perPage: Math.min(50, Math.max(1, limit)), status: 'publish' });
  return { results: result.data, total: result.meta.total, mode: 'keyword' };
}

export async function listPublicContent(name: PublicContentTable, params: { page?: number; perPage?: number } = {}) {
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(500, Math.max(1, params.perPage || 20));
  const offset = (page - 1) * perPage;
  const status = name === 'links' ? 1 : name === 'albums' ? 'public' : 'publish';
  const order = name === 'links'
    ? 'case when order_num > 0 then order_num else id end asc, id asc'
    : name === 'albums'
      ? 'sort_order asc, created_at desc'
      : 'created_at desc, id desc';
  const total = await one<{ count: string }>(
    `select count(*)::text as count from ${table(name)} where status = $1`,
    [status],
  ).catch(() => null);
  const rows = await many<Record<string, unknown>>(
    `select * from ${table(name)} where status = $1 order by ${order} limit $2 offset $3`,
    [status, perPage, offset],
  ).catch(() => []);
  const count = Number(total?.count || 0);
  return {
    data: Array.from(rows),
    meta: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
    pagination: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
  };
}

export async function listPublicFootprints(filters: { city?: string; country?: string; route?: string; keyword?: string } = {}) {
  const where = [`p.type = 'post'`, `p.status = 'publish'`, `pf.place_id is not null`];
  const params: unknown[] = [];
  const addIlike = (sql: string, value: string | undefined) => {
    const term = String(value || '').trim();
    if (!term) return;
    params.push(`%${term}%`);
    where.push(sql.replaceAll('?', `$${params.length}`));
  };
  addIlike(`coalesce(fp.city_name,'') ilike ?`, filters.city);
  addIlike(`(coalesce(fp.country_name,'') ilike ? or coalesce(fp.country_code,'') ilike ?)`, filters.country);
  addIlike(`fr.name ilike ?`, filters.route);
  addIlike(
    `(coalesce(fp.city_name,'') ilike ? or coalesce(fp.country_name,'') ilike ? or coalesce(fp.country_code,'') ilike ?)`,
    filters.keyword,
  );
  return many<Record<string, unknown>>(
    `select pf.id, pf.post_id, p.status, p.title, p.slug, p.cover_url, p.display_id, p.created_at,
            pf.visited_at, pf.route_order, coalesce(pf.keywords,'') as keywords,
            coalesce(fp.id,0) as place_id, coalesce(fp.country_name,'') as country_name,
            coalesce(fp.country_code,'') as country_code, coalesce(fp.city_name,'') as city_name,
            fp.latitude, fp.longitude, coalesce(fr.id,0) as route_id, coalesce(fr.name,'') as route_name
     from ${table('post_footprints')} pf
     join ${table('posts')} p on p.id = pf.post_id
     left join ${table('footprint_places')} fp on fp.id = pf.place_id
     left join ${table('footprint_routes')} fr on fr.id = pf.route_id
     where ${where.join(' and ')}
     order by coalesce(nullif(pf.visited_at,0), p.created_at) desc, pf.id desc
     limit 200`,
    params,
  ).catch(() => []);
}

export async function listPostComments(postId: number) {
  const rows = await many<Record<string, unknown>>(
    `select * from ${table('comments')} where post_id = $1 and status = 'approved' order by created_at asc, id asc`,
    [postId],
  ).catch(() => []);
  return rows.map((row) => ({ ...row, geo: commentGeoFromRow(row.geo) }));
}

export async function listMoments(params: { page?: number; perPage?: number } = {}) {
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(500, Math.max(1, params.perPage || 20));
  const offset = (page - 1) * perPage;
  const total = await one<{ count: string }>(
    `select count(*)::text as count from ${table('moments')} where visibility = 'public'`,
  ).catch(() => null);
  const rows = await many<Record<string, unknown>>(
    `select * from ${table('moments')} where visibility = 'public'
     order by is_pinned desc, created_at desc, id desc
     limit $1 offset $2`,
    [perPage, offset],
  ).catch(() => []);
  const count = Number(total?.count || 0);
  return {
    data: { moments: rows, total: count },
    meta: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
    pagination: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
  };
}

export async function listComments(params: { page?: number; perPage?: number; status?: string; excludeAdmin?: boolean } = {}) {
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(500, Math.max(1, params.perPage || 20));
  const offset = (page - 1) * perPage;
  const where: string[] = [];
  const queryParams: unknown[] = [];
  const status = params.status || 'approved';
  if (status) {
    queryParams.push(status);
    where.push(`c.status = $${queryParams.length}`);
  }
  if (params.excludeAdmin) {
    where.push(`coalesce(u.role, '') != 'admin'`);
    const adminEmails = await many<{ email: string }>(`select lower(trim(email)) as email from ${table('users')} where role = 'admin'`).catch(() => []);
    const emails = adminEmails.map((row) => row.email).filter(Boolean);
    if (emails.length) {
      queryParams.push(emails);
      where.push(`lower(trim(coalesce(c.author_email,''))) != all($${queryParams.length}::text[])`);
    }
  }
  const whereSql = where.length ? `where ${where.join(' and ')}` : '';
  const total = await one<{ count: string }>(
    `select count(*)::text as count
     from ${table('comments')} c
     left join ${table('users')} u on u.id = c.user_id
     ${whereSql}`,
    queryParams,
  ).catch(() => null);
  const rows = await many<Record<string, unknown>>(
    `select c.*,
            p.title as post_title, p.slug as post_slug, p.display_id as post_display_id,
            p.created_at as post_created_at, p.published_at as post_published_at,
            p.comment_count as post_comment_count,
            coalesce(u.role,'') as user_role,
            pc.author_name as parent_author, pc.content as parent_content, pc.created_at as parent_created_at
     from ${table('comments')} c
     left join ${table('posts')} p on p.id = c.post_id
     left join ${table('users')} u on u.id = c.user_id
     left join ${table('comments')} pc on pc.id = c.parent_id
     ${whereSql}
     order by c.created_at desc, c.id desc
     limit $${queryParams.length + 1} offset $${queryParams.length + 2}`,
    [...queryParams, perPage, offset],
  ).catch(() => []);
  const data = rows.map((row) => {
    const parentContent = String(row.parent_content || '');
    return {
      ...row,
      geo: commentGeoFromRow(row.geo),
      author: row.author_name,
      email: row.author_email,
      url: row.author_url,
      ip: row.author_ip,
      user_agent: row.author_agent,
      avatar_url: gravatarUrlForEmail(String(row.author_email || ''), 64),
      author_avatar: gravatarUrlForEmail(String(row.author_email || ''), 48),
      is_admin: row.user_role === 'admin',
      comment_count: 1,
      level: 1,
      parent: row.parent_id ? {
        id: row.parent_id,
        author: row.parent_author,
        content: [...parentContent].length > 100 ? `${[...parentContent].slice(0, 100).join('')}...` : parentContent,
        created_at: row.parent_created_at,
      } : undefined,
    };
  });
  const count = Number(total?.count || 0);
  return {
    data,
    meta: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
    pagination: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
  };
}

export async function loadHomePageDataDirect(page: number) {
  const options = await getOptionsMap();
  const perPage = Number(options.posts_per_page) || 10;
  const [postsRes, categories, archiveStats, momentsRes, commentsRes] = await Promise.all([
    listPosts({ page, perPage, status: 'publish' }),
    listMetas('category'),
    archiveStatsPayload(),
    listMoments({ perPage: 1 }),
    listComments({ perPage: 60, status: 'approved', excludeAdmin: true }),
  ]);
  const moments = momentsRes.data.moments || [];
  return {
    posts: (postsRes.data || []).filter((post: any) => post.id != null && post.title),
    page,
    totalPages: postsRes.meta.total_pages || 1,
    categories,
    archiveStats,
    latestMoment: moments[0] || null,
    latestComments: commentsRes.data || [],
    perPage,
    options,
  };
}
