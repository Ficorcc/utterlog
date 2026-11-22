import Link from '@/components/AppLink';
import { tagHref, type GlazeTag } from './utils';

/**
 * 标签总览：标签渲染成小胶囊（# + 名称 + 文章数）。
 *
 *   header.page-heading.glaze-panel   标题
 *   div.tag-cloud
 *     a.tag-chip.glaze-panel           # + 名称 + 文章数
 */

export interface TagsPageProps {
  tags?: GlazeTag[];
}

export default function TagsPage({ tags = [] }: TagsPageProps) {
  const list = Array.isArray(tags) ? tags : [];

  return (
    <section className="tags-page">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle">
            <span className="glaze-icon" data-glaze-icon="tags" aria-hidden="true" />
          </span>
          <span>标签</span>
        </h1>
      </header>

      {list.length === 0 ? (
        <div className="empty-state glaze-panel">
          <p>还没有标签</p>
        </div>
      ) : (
        <div className="tag-cloud">
          {list.map((tag) => (
            <Link
              key={tag.id ?? tag.slug}
              href={tagHref(tag)}
              className="tag-chip glaze-panel"
              prefetch={false}
            >
              <span className="post-tag-hash">#</span>
              <span>{tag.name}</span>
              <sup className="post-tag-count">{Number(tag.count || 0)}</sup>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
