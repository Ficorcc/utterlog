import Link from '@/components/AppLink';
import { categoryColor } from './utils';

/**
 * 分类总览：沿用上游归档页里的分类卡片网格
 * （pages/archive.php 的 .archive-categories 区块）。
 *
 *   .archive-page > .archive-shell
 *     .archive-hero            标题 + 统计
 *     .archive-categories      分类卡片网格
 */
export default function CategoriesPage({ categories = [] }: { categories?: any[] }) {
  const list = Array.isArray(categories) ? categories : [];
  const totalPosts = list.reduce((sum, category) => sum + Number(category?.count || 0), 0);
  const withPosts = list.filter((category) => Number(category?.count || 0) > 0).length;

  return (
    <section className="archive-page">
      <div className="archive-shell">
        <header className="archive-hero">
          <div className="archive-title">
            <i className="fa-solid fa-folder-tree" aria-hidden="true" />
            <h1>分类</h1>
          </div>
          <div className="archive-stats" aria-label="分类统计">
            <span>
              <strong>{list.length}</strong> 个分类
            </span>
            <span>
              <strong>{withPosts}</strong> 个有文章
            </span>
            <span>
              <strong>{totalPosts.toLocaleString()}</strong> 篇文章
            </span>
          </div>
        </header>

        <section className="archive-categories">
          <div className="archive-section-head archive-section-head-row">
            <h2>
              <i className="fa-solid fa-folder-tree" aria-hidden="true" /> 全部分类
            </h2>
            <p>{list.length} 个</p>
          </div>
          <div className="archive-category-panel">
            <div className="archive-category-grid">
              {list.length === 0 ? <p className="empty">还没有分类</p> : null}
              {list.map((category: any, index: number) => (
                <Link
                  key={category.id}
                  prefetch={false}
                  href={`/categories/${category.slug}`}
                  className={`archive-category-card cat-color-${categoryColor(index)}`}
                >
                  <div className="archive-category-main">
                    <span className="archive-category-icon">
                      <i className={category.icon || 'fa-regular fa-folder'} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{category.name}</h3>
                      <span>{Number(category.count || 0)} 篇</span>
                    </div>
                  </div>
                  {category.description ? <p>{category.description}</p> : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
