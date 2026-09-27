'use client';

/** ShanYing · 分类页 */

import Link from '@/components/AppLink';
import PostCard from './PostCard';
import { renderCatIcon } from './shanying-shared';

export default function CategoryPage({
  category,
  posts = [],
}: {
  category: any;
  posts?: any[];
  timeZone?: string;
}) {
  const name = category?.name || '分类';
  const description = category?.description || `关于${name}的记录与分享。`;

  return (
    <div className="sy-taxonomy">
      <header className="sy-archive-head">
        <h1>
          <span className="sy-archive-title-icon" aria-hidden="true">
            {renderCatIcon(category?.icon, 24)}
          </span>
          {name}
        </h1>
        <div className="sy-archive-stats">
          <span><b>{posts.length}</b> 篇文章</span>
        </div>
      </header>

      <p className="sy-taxonomy-desc">{description}</p>

      <div className="sy-card-grid">
        {posts.length === 0 && (
          <p className="sy-archive-empty">
            这个分类还没有文章，去 <Link prefetch={false} href="/archives">归档</Link> 看看别的吧。
          </p>
        )}
        {posts.map((post: any, index: number) => (
          <PostCard key={post.id} post={post} index={index + 1} />
        ))}
      </div>
    </div>
  );
}
