import { table } from '../config';
import { exec, many, nowUnix, one } from '../db/helpers';
import { optionValue, saveOption } from '../db/options';

export class MomentServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const writableFields = [
  'content',
  'images',
  'location',
  'mood',
  'source',
  'source_id',
  'source_url',
  'visibility',
  'is_pinned',
] as const;

function momentInput(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of writableFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) data[field] = body[field];
  }
  if (Object.prototype.hasOwnProperty.call(data, 'content')) {
    const content = String(data.content || '').trim();
    if (!content) throw new MomentServiceError(400, '内容不能为空');
    data.content = content;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'images')) {
    data.images = Array.isArray(data.images)
      ? data.images.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }
  if (Object.prototype.hasOwnProperty.call(data, 'visibility')) {
    const visibility = String(data.visibility || 'public').trim();
    data.visibility = visibility || 'public';
  }
  if (Object.prototype.hasOwnProperty.call(data, 'source')) {
    const source = String(data.source || '').trim();
    data.source = !source || ['local', 'web', 'browser'].includes(source.toLowerCase()) ? '网页' : source;
  }
  return data;
}

async function mergeMomentTag(mood: unknown) {
  const tag = String(mood || '').trim();
  if (!tag) return;
  const current = (await optionValue('moment_tags', '')).split(',').map((item) => item.trim()).filter(Boolean);
  if (!current.includes(tag)) await saveOption('moment_tags', [...current, tag].join(','));
}

export async function getMoment(id: number, authed = false) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await one<Record<string, unknown>>(`select * from ${table('moments')} where id = $1`, [id]);
  if (!row || (!authed && String(row.visibility || 'public') !== 'public')) return null;
  return row;
}

export async function createMoment(body: Record<string, unknown>, userId: number) {
  const data = momentInput(body);
  if (!Object.prototype.hasOwnProperty.call(data, 'content')) throw new MomentServiceError(400, '内容不能为空');
  if (!Object.prototype.hasOwnProperty.call(data, 'source')) data.source = '网页';
  if (!Object.prototype.hasOwnProperty.call(data, 'visibility')) data.visibility = 'public';
  const now = nowUnix();
  const entries = Object.entries({ ...data, author_id: userId, created_at: now, updated_at: now });
  const names = entries.map(([name]) => name);
  const values = entries.map(([, value]) => value ?? null);
  const rows = await many<{ id: number }>(
    `insert into ${table('moments')} (${names.join(', ')}) values (${names.map((_, index) => `$${index + 1}`).join(', ')}) returning id`,
    values,
  );
  const id = Number(rows[0]?.id || 0);
  await mergeMomentTag(data.mood);
  return id;
}

export async function updateMoment(id: number, body: Record<string, unknown>) {
  if (!Number.isInteger(id) || id <= 0) throw new MomentServiceError(400, '无效的说说 ID');
  if (!await getMoment(id, true)) throw new MomentServiceError(404, '说说不存在');
  const data = momentInput(body);
  const entries = Object.entries({ ...data, updated_at: nowUnix() });
  if (entries.length > 0) {
    const sets = entries.map(([name], index) => `${name} = $${index + 1}`);
    await exec(`update ${table('moments')} set ${sets.join(', ')} where id = $${entries.length + 1}`, [
      ...entries.map(([, value]) => value ?? null),
      id,
    ]);
  }
  await mergeMomentTag(data.mood);
  return id;
}

export async function deleteMoment(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new MomentServiceError(400, '无效的说说 ID');
  if (!await getMoment(id, true)) throw new MomentServiceError(404, '说说不存在');
  await exec(`delete from ${table('moments')} where id = $1`, [id]);
}

export async function toggleMomentLike(id: number, visitorToken: string) {
  if (!Number.isInteger(id) || id <= 0) throw new MomentServiceError(400, '无效的说说 ID');
  if (!/^[a-f0-9]{32}$/i.test(visitorToken)) throw new MomentServiceError(400, '无效的点赞标识');

  const moment = await one<{ id: number }>(
    `select id from ${table('moments')} where id = $1 and visibility = 'public'`,
    [id],
  );
  if (!moment) throw new MomentServiceError(404, '说说不存在');

  const removed = await one<{ moment_id: number }>(
    `delete from ${table('moment_likes')} where moment_id = $1 and visitor_token = $2 returning moment_id`,
    [id, visitorToken],
  );
  let liked = false;
  if (!removed) {
    await exec(
      `insert into ${table('moment_likes')} (moment_id, visitor_token, created_at)
       values ($1, $2, $3) on conflict (moment_id, visitor_token) do nothing`,
      [id, visitorToken, nowUnix()],
    );
    liked = true;
  }

  const count = await one<{ count: string }>(
    `select count(*)::text as count from ${table('moment_likes')} where moment_id = $1`,
    [id],
  );
  return { id, liked, like_count: Number(count?.count || 0) };
}

// ── 说说评论 ──────────────────────────────────────────────
// 轻量评论区：无嵌套回复、默认过审（垃圾过滤后续可加 status 过滤）。

export async function listMomentComments(momentId: number) {
  if (!Number.isInteger(momentId) || momentId <= 0) throw new MomentServiceError(400, '无效的说说 ID');
  return many(
    `select id, author_name, author_email, author_url, content, created_at, is_admin
     from ${table('moment_comments')}
     where moment_id = $1 and status = 'approved'
     order by created_at asc, id asc
     limit 200`,
    [momentId],
  ).catch(() => []);
}

function commentAuthorField(value: unknown, label: string, max: number) {
  const text = String(value || '').trim();
  if (text.length > max) throw new MomentServiceError(400, `${label}过长`);
  return text;
}

export async function createMomentComment(momentId: number, body: Record<string, unknown>, visitorId = '') {
  if (!Number.isInteger(momentId) || momentId <= 0) throw new MomentServiceError(400, '无效的说说 ID');
  const exists = await one<{ id: number }>(
    `select id from ${table('moments')} where id = $1`, [momentId],
  ).catch(() => null);
  if (!exists) throw new MomentServiceError(404, '说说不存在');
  const name = commentAuthorField(body.author_name, '昵称', 30);
  if (!name) throw new MomentServiceError(400, '昵称不能为空');
  const email = commentAuthorField(body.author_email, '邮箱', 100);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new MomentServiceError(400, '邮箱格式不正确');
  const url = commentAuthorField(body.author_url, '网址', 200);
  if (url && !/^https?:\/\//i.test(url)) throw new MomentServiceError(400, '网址需以 http(s):// 开头');
  const content = String(body.content || '').trim();
  if (!content) throw new MomentServiceError(400, '评论内容不能为空');
  if (content.length > 1000) throw new MomentServiceError(400, '评论内容过长（最多 1000 字）');
  // 博主免登录：邮箱与站长一致即标记为博主（前台徽标、后台列表高亮）
  const admin = email
    ? await one<{ name: string }>(
        `select coalesce(nullif(nickname, ''), username) as name
         from ${table('users')} where role = 'admin' and lower(email) = lower($1) limit 1`,
        [email],
      ).catch(() => null)
    : null;
  const rows = await many<{ id: number }>(
    `insert into ${table('moment_comments')} (moment_id, author_name, author_email, author_url, content, visitor_id, created_at, is_admin)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [momentId, name, email, url, content, String(visitorId || '').slice(0, 64), nowUnix(), Boolean(admin)],
  );
  return { id: rows[0]?.id || 0, is_admin: Boolean(admin) };
}

// ── 说说评论 · 后台管理 ────────────────────────────────────
export async function listMomentCommentsAdmin(params: { page?: number; perPage?: number; search?: string } = {}) {
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(100, Math.max(1, params.perPage || 20));
  const search = String(params.search || '').trim();
  const like = `%${search}%`;
  const where = search
    ? `where mc.author_name ilike $1 or mc.content ilike $1 or mc.author_email ilike $1`
    : '';
  const args = search ? [like] : [];
  const total = await one<{ count: string }>(
    `select count(*)::text as count from ${table('moment_comments')} mc ${where}`,
    args,
  ).catch(() => null);
  const rows = await many(
    `select mc.id, mc.author_name, mc.author_email, mc.author_url, mc.content,
            mc.is_admin, mc.created_at,
            left(regexp_replace(coalesce(m.content, ''), E'\\s+', ' ', 'g'), 80) as moment_content,
            m.id as moment_id
     from ${table('moment_comments')} mc
     left join ${table('moments')} m on m.id = mc.moment_id
     ${where}
     order by mc.created_at desc, mc.id desc
     limit $${args.length + 1} offset $${args.length + 2}`,
    [...args, perPage, (page - 1) * perPage],
  ).catch(() => []);
  const count = Number(total?.count || 0);
  return {
    data: rows,
    meta: { total: count, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(count / perPage)) },
  };
}

export async function deleteMomentComment(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new MomentServiceError(400, '无效的评论 ID');
  const rows = await many<{ id: number }>(
    `delete from ${table('moment_comments')} where id = $1 returning id`, [id],
  ).catch(() => []);
  if (!rows[0]) throw new MomentServiceError(404, '评论不存在');
  return { id: rows[0].id };
}
