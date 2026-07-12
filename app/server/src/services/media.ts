import { existsSync, statfsSync } from 'node:fs';
import { config, table } from '../config';
import { many, one } from '../db/helpers';

function diskStats(path = '/') {
  try {
    const stat = statfsSync(path);
    const total = Number(stat.blocks) * Number(stat.bsize);
    const free = Number(stat.bavail) * Number(stat.bsize);
    const used = Math.max(0, total - free);
    return { total, free, used, percent: total > 0 ? Math.round((used / total) * 100) : 0, path };
  } catch {
    return { total: 0, free: 0, used: 0, percent: 0, path };
  }
}

export async function listMediaRecords(options: {
  page?: number;
  perPage?: number;
  category?: string;
  excludeCategory?: string;
} = {}) {
  const page = Math.max(1, Math.floor(options.page || 1));
  const perPage = Math.min(500, Math.max(1, Math.floor(options.perPage || 20)));
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.category) {
    params.push(options.category);
    where.push(`category = $${params.length}`);
  }
  if (options.excludeCategory) {
    params.push(options.excludeCategory);
    where.push(`category != $${params.length}`);
  }
  const whereSql = where.length ? `where ${where.join(' and ')}` : '';
  const totalRow = await one<{ count: string }>(`select count(*)::text as count from ${table('media')} ${whereSql}`, params);
  const rows = await many<Record<string, unknown>>(
    `select * from ${table('media')} ${whereSql} order by created_at desc, id desc
     limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage],
  );
  const total = Number(totalRow?.count || 0);
  return { rows, meta: { total, page, per_page: perPage, total_pages: Math.max(1, Math.ceil(total / perPage)) } };
}

export async function mediaStorageStats() {
  const rows = await many<{ driver: string; files: number; size: string }>(
    `select coalesce(nullif(driver,''),'local') as driver, count(*)::int as files, coalesce(sum(size),0)::text as size
     from ${table('media')} group by driver`,
  ).catch(() => []);
  const drivers: Record<string, { files: number; size: number }> = {};
  let files = 0;
  let size = 0;
  for (const row of rows) {
    const stat = { files: Number(row.files || 0), size: Number(row.size || 0) };
    drivers[row.driver || 'local'] = stat;
    files += stat.files;
    size += stat.size;
  }
  return {
    files,
    size,
    drivers,
    disk: diskStats(existsSync(config.uploadDir) ? config.uploadDir : '.'),
    total: files,
    total_size: size,
  };
}
