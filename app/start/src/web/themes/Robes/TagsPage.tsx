'use client';

import Link from '@/components/AppLink';
import { IconTag } from './Icons';

export default function TagsPage({ tags }: { tags: { id: number; name: string; slug: string; count: number }[] }) {
  const list = Array.isArray(tags) ? tags : [];
  return (
    <article className="article standalone-page">
      <div className="page-banner">
        <span className="gb-badge">标签</span>
        <h1 className="gb-title">全部标签</h1>
        <p className="gb-sub">共 {list.length} 个标签</p>
      </div>
      {list.length ? (
        <div className="sidebar-tags" style={{ padding: '4px 2px 12px' }}>
          {list.map((tag) => (
            <Link className="sidebar-tag" key={tag.id} href={`/tags/${encodeURIComponent(tag.slug)}`} title={`${tag.count} 篇文章`}>
              <IconTag size={12} />
              {tag.name}
              <span className="nav-count">{tag.count}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="arch-empty">还没有标签</p>
      )}
    </article>
  );
}
