'use client';

import Link from '@/components/AppLink';

/** 标签总览：按文章数从多到少排的词云。 */
export default function TagsPage({ tags = [] }: { tags?: any[] }) {
  const list = Array.isArray(tags) ? [...tags] : [];
  list.sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0));

  return (
    <>
      <div className="wh-page-header">
        <h1 className="wh-page-title">标签</h1>
        <p className="wh-page-subtitle">{list.length} 个标签</p>
      </div>

      {list.length ? (
        <nav className="wh-tag-cloud" aria-label="全部标签">
          {list.map((tag) => (
            <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.slug)}`} className="wh-cloud-tag">
              #{tag.name}
              <sup>{tag.count || 0}</sup>
            </Link>
          ))}
        </nav>
      ) : (
        <p className="wh-empty">还没有标签。</p>
      )}
    </>
  );
}
