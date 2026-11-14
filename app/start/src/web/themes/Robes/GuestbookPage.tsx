'use client';

import CommentList from '@/components/blog/CommentList';
import { IconChat, IconFileText, IconLink, IconLock } from './Icons';
import { relativeTime } from './utils';

/**
 * 留言板：复刻原主题 guestbook.php 的结构。
 *
 *   .gb-page  → .gb-hero（徽标 / 标题 / 副标题 / 三格统计）+ .gb-tips + 评论流
 *
 * Utterlog 的留言板是一篇特殊文章（type=guestbook）下的评论区，
 * 所以评论流直接复用公共的 CommentList，只换外壳。
 */
export default function GuestbookPage({
  postId,
  commentCount,
  commentAuthors,
  lastCommentAt,
}: {
  postId: number;
  commentCount: number;
  commentAuthors?: number;
  lastCommentAt?: number;
}) {
  const lastText = lastCommentAt ? relativeTime(lastCommentAt) : '还没有留言';

  return (
    <div className="gb-page">
      <section className="gb-hero">
        <span className="gb-deco" aria-hidden="true">
          <IconChat size={26} />
        </span>
        <div className="gb-hero-body">
          <span className="gb-badge">
            <IconChat size={13} />
            Guestbook
          </span>
          <h1 className="gb-title">留言板</h1>
          <p className="gb-sub">不必想好开场白，路过就留下点什么吧。</p>
        </div>
        <div className="gb-stats">
          <div className="gb-stat">
            <b>{Number(commentCount || 0)}</b>
            <span>条留言</span>
          </div>
          <div className="gb-stat">
            <b>{Number(commentAuthors || 0)}</b>
            <span>位留言者</span>
          </div>
          <div className="gb-stat">
            <b className="gb-stat-time">{lastText}</b>
            <span>最近留言</span>
          </div>
        </div>
      </section>

      <div className="gb-tips">
        <div className="gb-tip">
          <IconFileText size={14} />
          <span><b>文章相关</b>讨论请到文章下留言</span>
        </div>
        <div className="gb-tip">
          <IconLink size={14} />
          <span><b>友链申请</b>请移步友链页</span>
        </div>
        <div className="gb-tip">
          <IconLock size={14} />
          <span><b>邮箱仅用于头像</b>，不会公开</span>
        </div>
      </div>

      <div id="comments">
        <CommentList postId={postId} title="留言板" formPlacement="bottom" />
      </div>
    </div>
  );
}
