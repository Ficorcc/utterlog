'use client';

import CommentList from '@/components/blog/CommentList';
import { useThemeContext } from '@/lib/theme-context';
import { dateTimeLabel } from './utils';

/**
 * 留言板页：统计条 + 共享评论区。
 *
 *   header.page-heading.glaze-panel
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *   ul.archive-stats[role=list]        评论数 / 参与人数 / 最后留言时间
 *   CommentList（共享组件，表单放在底部）
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
  const { timeZone } = useThemeContext();
  const total = Number(commentCount || 0);
  const authors = Number(commentAuthors || 0);
  const lastText = lastCommentAt ? dateTimeLabel(lastCommentAt, timeZone) : '';

  return (
    <div className="glaze-guestbook">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle" aria-hidden="true">
            <span className="glaze-icon" data-glaze-icon="guestbook" />
          </span>
          <span>留言板</span>
        </h1>
        <p className="archive-description">路过留个言，随便写点什么都可以</p>
      </header>

      <ul className="archive-stats" role="list" aria-label="留言统计">
        <li>
          <strong>{total}</strong> 条留言
        </li>
        <li>
          <strong>{authors}</strong> 位留言者
        </li>
        <li>
          <strong>{lastText || '还没有留言'}</strong> 最后留言
        </li>
      </ul>

      <section className="glaze-guestbook-comments glaze-panel">
        <CommentList postId={postId} title="留言板" formPlacement="bottom" />
      </section>
    </div>
  );
}
