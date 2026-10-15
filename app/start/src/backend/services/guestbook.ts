import { table } from '../config';
import { sql } from '../db/client';

// A published, non-article post gives the guestbook its own comment thread.
// Its type keeps it out of post archives, feeds, search and article counts.
export const GUESTBOOK_THREAD_SLUG = 'utterlog-system-guestbook-thread';

export async function guestbookThread() {
  const posts = table('posts');
  const existing = await sql.unsafe<{ id: number; comment_count: number }[]>(
    `select id, comment_count from ${posts} where slug = $1 and type = 'guestbook' and deleted_at = 0 limit 1`,
    [GUESTBOOK_THREAD_SLUG],
  );
  if (existing[0]) return existing[0];

  return sql.begin(async (tx) => {
    // Match the positive IDs used by the public comments API, and serialize
    // first-time visits so simultaneous requests never create two threads.
    await tx.unsafe(`lock table ${posts} in share row exclusive mode`);
    const rows = await tx.unsafe<{ id: number; comment_count: number; type: string }[]>(
      `select id, comment_count, type from ${posts} where slug = $1 and deleted_at = 0 limit 1`,
      [GUESTBOOK_THREAD_SLUG],
    );
    if (rows[0]) {
      if (rows[0].type !== 'guestbook') throw new Error('Guestbook thread slug is already in use');
      return rows[0];
    }

    const owner = await tx.unsafe<{ id: number }[]>(
      `select id from ${table('users')} order by (role = 'admin') desc, id asc limit 1`,
    );
    if (!owner[0]) throw new Error('Guestbook requires a site owner');
    const next = await tx.unsafe<{ id: number }[]>(
      `select (coalesce(max(id), 0) + 1)::int as id from ${posts} where id > 0`,
    );
    const id = Number(next[0]?.id || 1);
    const now = Math.floor(Date.now() / 1000);
    await tx.unsafe(
      `insert into ${posts}
        (id, title, slug, content, author_id, status, type, allow_comment, created_at, updated_at)
       values ($1, '留言板', $2, '', $3, 'publish', 'guestbook', true, $4, $4)`,
      [id, GUESTBOOK_THREAD_SLUG, owner[0].id, now],
    );
    await tx.unsafe(
      `select setval(pg_get_serial_sequence($1, 'id'), greatest((select coalesce(max(id), 1) from ${posts} where id > 0), 1), true)`,
      [posts],
    );
    return { id, comment_count: 0 };
  });
}

export function commentPagePath(post: { type?: string | null; slug?: string | null } | null, postId: number, commentId: number) {
  const path = post?.type === 'guestbook'
    ? '/guestbook'
    : `/posts/${encodeURIComponent(post?.slug || String(postId))}`;
  return `${path}#comment-${commentId}`;
}
