import Link from '@/components/AppLink';
import { categoryColor } from './utils';

/**
 * 标签总览：沿用上游的分类卡片网格（pages/archive.php 的 .archive-categories）。
 *
 *   .post-list
 *     .posts-hero              标题 + 统计
 *     .archive-category-grid   标签卡片网格
 */
export default function TagsPage({ tags = [] }: { tags?: any[] }) {
  const list = Array.isArray(tags) ? tags : [];
  const totalPosts = list.reduce((sum, tag) => sum + Number(tag?.count || 0), 0);

  return (
    <section className="post-list">
      <header className="posts-hero">
        <div className="posts-hero-head">
          <div className="posts-hero-kicker-row">
            <span className="posts-hero-kicker">
              <i className="fa-solid fa-tags" aria-hidden="true" />
              <span aria-hidden="true">·</span>
              <span>TAGS</span>
              <span aria-hidden="true">·</span>
              <span>标签</span>
            </span>
            <p className="posts-hero-sub">
              <span className="posts-hero-count">
                {list.length} 个标签 · 共 {totalPosts.toLocaleString()} 篇文章
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="archive-category-grid">
        {list.length === 0 ? <p className="empty">还没有标签</p> : null}
        {list.map((tag: any, index: number) => (
          <Link
            key={tag.id}
            prefetch={false}
            href={`/tags/${tag.slug}`}
            className={`archive-category-card cat-color-${categoryColor(index)}`}
          >
            <div className="archive-category-main">
              <span className="archive-category-icon">
                <i className="fa-solid fa-tag" aria-hidden="true" />
              </span>
              <div>
                <h3>#{tag.name}</h3>
                <span>{Number(tag.count || 0)} 篇</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
