'use client';

/** ShanYing · 分类总览 */

import Link from '@/components/AppLink';
import { renderCatIcon } from './shanying-shared';

export default function CategoriesPage({ categories = [] }: { categories?: any[] }) {
  const total = categories.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

  return (
    <div className="sy-archive">
      <header className="sy-archive-head">
        <h1>
          <span className="sy-archive-title-icon" aria-hidden="true">
            <i className="fa-regular fa-folder" />
          </span>
          分类
        </h1>
        <div className="sy-archive-stats">
          <span><b>{categories.length}</b> 个分类</span>
          <span><b>{total.toLocaleString()}</b> 篇文章</span>
        </div>
      </header>

      <div className="sy-archive-cats">
        {categories.length === 0 && <p className="sy-archive-empty">还没有创建分类。</p>}
        {categories.map((category: any) => (
          <div className="sy-archive-cat" key={category.id}>
            <header>
              <Link prefetch={false} href={`/categories/${category.slug}`}>
                {renderCatIcon(category.icon, 18)}
                <span>{category.name}</span>
              </Link>
              <span>{category.count || 0} 篇</span>
            </header>
            <p>{category.description || `关于${category.name}的记录与分享。`}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
