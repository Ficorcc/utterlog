import Link from '@/components/AppLink';
import { categoryHref, type GlazeCategory } from './utils';

/**
 * 分类总览：上游归档页里的分类卡片网格。
 *
 *   header.page-heading.glaze-panel   标题
 *   div.category-grid
 *     a.category-card.glaze-panel     图标 + 名称 + 文章数
 */

export interface CategoriesPageProps {
  categories?: GlazeCategory[];
}

/** 分类图标：站点自定义的 Font Awesome 类名优先，否则用主题图标 */
function CategoryIcon({ icon }: { icon?: string }) {
  if (icon && /^fa[-\s]/.test(icon)) {
    return <span className={`glaze-icon ${icon}`} aria-hidden="true" />;
  }
  return <span className="glaze-icon" data-glaze-icon="categories" aria-hidden="true" />;
}

export default function CategoriesPage({ categories = [] }: CategoriesPageProps) {
  const list = Array.isArray(categories) ? categories : [];

  return (
    <section className="categories-page">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle">
            <span className="glaze-icon" data-glaze-icon="categories" aria-hidden="true" />
          </span>
          <span>分类</span>
        </h1>
      </header>

      {list.length === 0 ? (
        <div className="empty-state glaze-panel">
          <p>还没有分类</p>
        </div>
      ) : (
        <div className="category-grid">
          {list.map((category) => (
            <Link
              key={category.id ?? category.slug}
              href={categoryHref(category)}
              className="category-card glaze-panel"
              prefetch={false}
            >
              <CategoryIcon icon={category.icon} />
              <span>{category.name}</span>
              <span>{Number(category.count || 0)} 篇</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
