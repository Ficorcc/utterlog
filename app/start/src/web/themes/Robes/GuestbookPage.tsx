'use client';

import CommentList from '@/components/blog/CommentList';

/**
 * 留言板：Utterlog 的留言板是一篇特殊文章下的评论区，
 * 这里套上 Robes 的页面外壳（标题 + 评论流）。
 */
export default function GuestbookPage({ postId, commentCount }: { postId: number; commentCount: number }) {
  return (
    <article className="article standalone-page guestbook-page">
      <div className="page-banner">
        <span className="gb-badge">Guestbook · 留言板</span>
        <h1 className="gb-title">留言板</h1>
        <p className="gb-sub">已经收到 {commentCount || 0} 条留言，随便写点什么吧</p>
      </div>
      <div id="comments">
        <CommentList postId={postId} title="留言板" formPlacement="bottom" />
      </div>
    </article>
  );
}
