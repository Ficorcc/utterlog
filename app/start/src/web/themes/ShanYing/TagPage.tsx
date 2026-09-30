'use client';

/** ShanYing · 标签页 */

import Link from '@/components/AppLink';
import { ArchivePostTimeline } from './ArchivePage';

export default function TagPage({
  tag,
  posts = [],
  timeZone = 'UTC',
}: {
  tag: any;
  posts?: any[];
  timeZone?: string;
}) {
  const name = tag?.name || '标签';

  return (
    <div className="sy-taxonomy">
      <header className="sy-archive-head">
        <h1>
          <span className="sy-archive-title-icon" aria-hidden="true">
            <i className="fa-regular fa-hashtag" />
          </span>
          {name}
        </h1>
        <div className="sy-archive-stats">
          <span><b>{posts.length}</b> 篇文章</span>
        </div>
      </header>

      <p className="sy-taxonomy-desc">带有 #{name} 标签的全部文章。</p>

      {posts.length === 0 ? (
        <p className="sy-archive-empty">
          这个标签还没有文章，去 <Link prefetch={false} href="/archives">归档</Link> 看看别的吧。
        </p>
      ) : <ArchivePostTimeline posts={posts} timeZone={timeZone} />}
    </div>
  );
}
