'use client';

import Link from '@/components/AppLink';
import { IconFolder } from './Icons';

export default function CategoriesPage({
  categories,
}: {
  categories: { id: number; name: string; slug: string; description?: string; count: number }[];
}) {
  const list = Array.isArray(categories) ? categories : [];
  return (
    <article className="article standalone-page">
      <div className="page-banner">
        <span className="gb-badge">分类</span>
        <h1 className="gb-title">全部分类</h1>
        <p className="gb-sub">共 {list.length} 个分类</p>
      </div>
      {list.length ? (
        <div className="links-grid">
          {list.map((category) => (
            <Link className="link-card" key={category.id} href={`/categories/${encodeURIComponent(category.slug)}`}>
              <div className="link-avatar">
                <div className="link-avatar-text">
                  <IconFolder size={16} />
                </div>
              </div>
              <div className="link-info">
                <div className="link-name">{category.name}</div>
                {category.description ? <div className="link-desc">{category.description}</div> : null}
                <div className="link-meta">
                  <span className="link-category-tag">{category.count} 篇</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="arch-empty">还没有分类</p>
      )}
    </article>
  );
}
