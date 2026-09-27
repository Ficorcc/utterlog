'use client';

/** ShanYing · 标签总览 */

import Link from '@/components/AppLink';

export default function TagsPage({ tags = [] }: { tags?: any[] }) {
  const sorted = [...tags].sort((a: any, b: any) => (b.count || 0) - (a.count || 0));

  return (
    <div className="sy-archive">
      <header className="sy-archive-head">
        <h1>
          <span className="sy-archive-title-icon" aria-hidden="true">
            <i className="fa-regular fa-hashtag" />
          </span>
          标签
        </h1>
        <div className="sy-archive-stats">
          <span><b>{sorted.length}</b> 个标签</span>
        </div>
      </header>

      <div className="sy-archive-tags sy-archive-tags--large">
        {sorted.length === 0 && <p className="sy-archive-empty">还没有创建标签。</p>}
        {sorted.map((tag: any) => (
          <Link prefetch={false} key={tag.id} href={`/tags/${tag.slug}`}>
            #{tag.name}
            <sup>{tag.count || 0}</sup>
          </Link>
        ))}
      </div>
    </div>
  );
}
