'use client';

import Link from '@/components/AppLink';

/** 分类总览：卡片式列出每个分类及其文章数。 */
export default function CategoriesPage({ categories = [] }: { categories?: any[] }) {
  const list = Array.isArray(categories) ? categories : [];
  const total = list.reduce((sum, item) => sum + Number(item?.count || 0), 0);

  return (
    <>
      <div className="wh-page-header">
        <h1 className="wh-page-title">分类</h1>
        <p className="wh-page-subtitle">
          {list.length} 个分类 · {total} 篇文章
        </p>
      </div>

      {list.length ? (
        <div className="wh-terms">
          {list.map((category) => (
            <Link key={category.id} href={`/categories/${encodeURIComponent(category.slug)}`} className="wh-term">
              <span className="wh-term-name">{category.name}</span>
              <span className="wh-term-count">{category.count || 0} 篇</span>
              {category.description ? <span className="wh-term-desc">{category.description}</span> : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="wh-empty">还没有创建分类。</p>
      )}
    </>
  );
}
