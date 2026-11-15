import { randomUUID } from 'node:crypto';
import { table } from '../config';
import { exec, many, nowUnix, one } from '../db/helpers';

/**
 * 评论点赞。
 *
 * 数据落在 ul_comment_likes（comment_id + visitor_token 联合主键），
 * ul_comments.like_count 是给列表页直接读的冗余计数，写入时一起维护 ——
 * 原站评论区的「♡ 点赞」也是这种写法（data-likes + 计数字段）。
 *
 * 访客标识用 HttpOnly cookie 里的随机 token（跟说说点赞同一套思路），
 * 不依赖 IP / User-Agent，所以同一台设备换个浏览器也不会串号。
 */

export const COMMENT_LIKE_COOKIE = 'utterlog_comment_like';

/** 从 cookie 里读点赞访客 token；没有就现造一个。 */
export function readCommentLikeToken(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const current = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COMMENT_LIKE_COOKIE}=`))?.slice(COMMENT_LIKE_COOKIE.length + 1) || '';
  if (/^[a-f0-9]{32}$/i.test(current)) return { value: current, created: false };
  return { value: randomUUID().replaceAll('-', ''), created: true };
}

export class CommentLikeServiceError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function toggleCommentLike(commentId: number, visitorToken: string) {
  if (!Number.isInteger(commentId) || commentId <= 0) {
    throw new CommentLikeServiceError(400, 'VALIDATION_ERROR', '无效的评论 ID');
  }
  if (!/^[a-f0-9]{32}$/i.test(visitorToken)) {
    throw new CommentLikeServiceError(400, 'VALIDATION_ERROR', '无效的点赞标识');
  }

  const comment = await one<{ id: number; post_id: number; status: string }>(
    `select id, post_id, status from ${table('comments')} where id = $1 limit 1`,
    [commentId],
  );
  if (!comment) throw new CommentLikeServiceError(404, 'NOT_FOUND', '评论不存在');
  if (comment.status !== 'approved') {
    throw new CommentLikeServiceError(400, 'VALIDATION_ERROR', '评论未通过审核');
  }

  // 先删后插：删掉了说明这次是取消点赞，没删掉才插入。
  const removed = await one<{ comment_id: number }>(
    `delete from ${table('comment_likes')} where comment_id = $1 and visitor_token = $2 returning comment_id`,
    [commentId, visitorToken],
  );

  let liked = false;
  if (!removed) {
    await exec(
      `insert into ${table('comment_likes')} (comment_id, visitor_token, created_at)
       values ($1, $2, $3) on conflict (comment_id, visitor_token) do nothing`,
      [commentId, visitorToken, nowUnix()],
    );
    liked = true;
  }

  const count = await one<{ count: string }>(
    `select count(*)::text as count from ${table('comment_likes')} where comment_id = $1`,
    [commentId],
  );
  const likeCount = Number(count?.count || 0);

  // 冗余计数同步。并发下可能与真实行数差一点，下一次点赞会再校正一次。
  await exec(`update ${table('comments')} set like_count = $2 where id = $1`, [commentId, likeCount]).catch(() => {});

  return { id: commentId, liked, like_count: likeCount };
}

/** 某条评论的点赞数（列表页批量用）。 */
export async function commentLikeCounts(commentIds: number[]) {
  if (!commentIds.length) return new Map<number, number>();
  const rows = await many<{ comment_id: number; count: string }>(
    `select comment_id, count(*)::text as count
     from ${table('comment_likes')}
     where comment_id = any($1::int[])
     group by comment_id`,
    [commentIds],
  ).catch(() => []);
  return new Map(rows.map((row) => [Number(row.comment_id), Number(row.count || 0)]));
}
