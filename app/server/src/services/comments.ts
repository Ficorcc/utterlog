import { table } from '../config';
import { sql } from '../db/client';

export type AdminCommentAction = 'approve' | 'delete' | 'spam' | 'trash';

const allowedStatuses = new Set(['approved', 'pending', 'spam', 'trash']);
const editableColumns = new Set(['author_name', 'author_email', 'author_url', 'content', 'featured', 'status']);

function commentIds(input: unknown) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 500);
}

function normalizePatch(input: Record<string, unknown>) {
  const patch: Record<string, unknown> = { ...input };
  if (input.author_name !== undefined || input.author !== undefined || input.name !== undefined) {
    patch.author_name = input.author_name ?? input.author ?? input.name;
  }
  if (input.author_email !== undefined || input.email !== undefined) {
    patch.author_email = input.author_email ?? input.email;
  }
  if (input.author_url !== undefined || input.url !== undefined) {
    patch.author_url = input.author_url ?? input.url;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (editableColumns.has(key)) result[key] = value;
  }
  if (result.status !== undefined && !allowedStatuses.has(String(result.status))) {
    throw new Error('invalid comment status');
  }
  if (result.content !== undefined && !String(result.content).trim()) {
    throw new Error('comment content required');
  }
  return result;
}

async function recountPosts(tx: any, postIds: number[]) {
  if (postIds.length === 0) return;
  await tx.unsafe(
    `update ${table('posts')} p
     set comment_count = (
       select count(*)::int from ${table('comments')} c
       where c.post_id = p.id and c.status = 'approved'
     )
     where p.id = any($1::int[])`,
    [postIds],
  );
}

export async function updateAdminComment(id: number, input: Record<string, unknown>) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const patch = normalizePatch(input);
  return sql.begin(async (tx) => {
    const rows = await tx.unsafe<{ post_id: number }[]>(
      `select post_id from ${table('comments')} where id = $1 for update`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    const entries = Object.entries(patch);
    if (entries.length > 0) {
      const sets = entries.map(([key], index) => `${key} = $${index + 1}`);
      const values = entries.map(([, value]) => value == null ? null : typeof value === 'boolean' ? value : String(value));
      sets.push(`updated_at = extract(epoch from now())::bigint`);
      await tx.unsafe(
        `update ${table('comments')} set ${sets.join(', ')} where id = $${values.length + 1}`,
        [...values, id] as Array<string | boolean | number | null>,
      );
    }
    await recountPosts(tx, [Number(row.post_id)]);
    return { id };
  });
}

async function resolveBatchIds(tx: any, ids: number[], allStatus?: string) {
  if (allStatus && allowedStatuses.has(allStatus)) {
    const rows = await tx.unsafe(
      `select id from ${table('comments')} where status = $1 order by id asc limit 5000`,
      [allStatus],
    ) as Array<{ id: number }>;
    return rows.map((row) => Number(row.id));
  }
  return ids;
}

export async function batchAdminComments(input: { ids?: unknown; action: AdminCommentAction; allStatus?: string }) {
  const ids = commentIds(input.ids);
  if (!['approve', 'delete', 'spam', 'trash'].includes(input.action)) throw new Error('invalid comment action');
  return sql.begin(async (tx) => {
    const targets = await resolveBatchIds(tx, ids, input.allStatus);
    if (targets.length === 0) return { affected: 0, ids: [] as number[] };

    if (input.action !== 'delete') {
      const nextStatus = input.action === 'approve' ? 'approved' : input.action;
      const rows = await tx.unsafe<{ id: number; post_id: number }[]>(
        `update ${table('comments')}
         set status = $1, updated_at = extract(epoch from now())::bigint
         where id = any($2::int[])
         returning id, post_id`,
        [nextStatus, targets],
      );
      await recountPosts(tx, [...new Set(rows.map((row) => Number(row.post_id)))]);
      return { affected: rows.length, ids: rows.map((row) => Number(row.id)) };
    }

    const rows = await tx.unsafe<{ id: number; post_id: number }[]>(
      `with recursive targets as (
         select id, post_id from ${table('comments')} where id = any($1::int[])
         union
         select c.id, c.post_id from ${table('comments')} c join targets t on c.parent_id = t.id
       )
       select id, post_id from targets`,
      [targets],
    );
    const deleteIds = [...new Set(rows.map((row) => Number(row.id)))];
    if (deleteIds.length > 0) {
      await tx.unsafe(`delete from ${table('comments')} where id = any($1::int[])`, [deleteIds]);
      await recountPosts(tx, [...new Set(rows.map((row) => Number(row.post_id)))]);
    }
    return { affected: deleteIds.length, ids: deleteIds };
  });
}

export async function deleteAdminComment(id: number) {
  return batchAdminComments({ ids: [id], action: 'delete' });
}

export async function approveAdminComment(id: number) {
  return updateAdminComment(id, { status: 'approved' });
}
