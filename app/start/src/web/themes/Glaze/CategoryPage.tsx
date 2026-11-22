import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import {
  cardDateLabel,
  categoriesOf,
  categoryHref,
  commentCountOf,
  coverOf,
  dateLabel,
  excerptOf,
  viewCountOf,
  type GlazeCategory,
} from './utils';

/**
 * 分类归档页：对照上游 pages/category.php。
 *
 *   header.page-heading.glaze-panel   分类名 + 分类描述
 *   div.post-list > article.post-card 文章卡片列表
 */

/** 文章列表项（列表接口不含正文） */
export interface CategoryPost {
  id: number;
  title?: string;
  slug?: string;
  excerpt?: string;
  cover_url?: string;
  view_count?: number;
  comment_count?: number;
  published_at?: string | number | null;
  created_at?: string | number;
  categories?: { id?: number; name?: string; slug?: string; icon?: string; count?: number }[];
}

export interface CategoryPageProps {
  category?: GlazeCategory & { description?: string };
  posts?: CategoryPost[];
  timeZone?: string;
}

/** 分类页一次最多展示的文章数 */
const PAGE_SIZE = 20;

function PostCard({ post, timeZone }: { post: CategoryPost; timeZone: string }) {
  const cover = coverOf(post);
  const cats = categoriesOf(post);
  const comments = commentCountOf(post);
  const views = viewCountOf(post);

  const heading = (
    <div className="post-card-heading">
      <h2 className="post-card-title">
        <span className="post-card-title-mark" aria-hidden="true">
          #
        </span>
        <PostLink post={post}>{post.title || '无标题'}</PostLink>
      </h2>
      {cats.length ? (
        <span className="post-meta-categories">
          {cats.map((category) => (
            <Link key={category.id ?? category.slug} href={categoryHref(category)} prefetch={false}>
              {category.name}
            </Link>
          ))}
        </span>
      ) : null}
    </div>
  );

  const footer = (
    <div className="post-card-footer">
      <div className="post-meta">
        <time className="post-card-date" dateTime={dateLabel(post.published_at || post.created_at, timeZone)}>
          {cardDateLabel(post, timeZone)}
        </time>
        {views ? (
          <span className="post-card-views">
            <i className="fa-regular fa-eye" aria-hidden="true" />
            <span>{views}</span>
          </span>
        ) : null}
      </div>
      {comments ? (
        <span className="post-card-comment-group t-avatar-group" aria-label={`${comments} 条评论`}>
          <span className="post-card-comment-count t-avatar">
            <i className="fa-regular fa-comment" aria-hidden="true" />
            <span>{comments > 999 ? '999+' : comments}</span>
          </span>
        </span>
      ) : null}
    </div>
  );

  if (cover) {
    return (
      <article id={`post-${post.id}`} className="post-card post-card-has-image glaze-panel">
        <div className="post-card-cover">
          <PostLink post={post} className="post-card-image" tabIndex={-1} aria-hidden="true">
            <img src={cover} alt="" loading="lazy" decoding="async" />
          </PostLink>
          {heading}
        </div>
        <div className="post-card-copy">
          <div className="post-excerpt">{excerptOf(post, 180)}</div>
          {footer}
        </div>
      </article>
    );
  }

  return (
    <article id={`post-${post.id}`} className="post-card glaze-panel">
      <div className="post-card-copy">
        {heading}
        <div className="post-excerpt">{excerptOf(post, 180)}</div>
        {footer}
      </div>
    </article>
  );
}

export default function CategoryPage({ category, posts = [], timeZone = 'UTC' }: CategoryPageProps) {
  const list = Array.isArray(posts) ? posts : [];
  const visible = list.slice(0, PAGE_SIZE);
  const rest = list.length - visible.length;
  const description = String(category?.description || '');

  return (
    <section className="category-page">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle">
            <span className="glaze-icon" data-glaze-icon="categories" aria-hidden="true" />
          </span>
          <span>{category?.name || '分类'}</span>
        </h1>
        {description ? <div className="archive-description">{description}</div> : null}
      </header>

      <section className="post-feed">
        {visible.length === 0 ? (
          <div className="empty-state glaze-panel">
            <p>该分类下还没有文章</p>
          </div>
        ) : (
          <div className="post-list">
            {visible.map((post) => (
              <PostCard key={post.id} post={post} timeZone={timeZone} />
            ))}
          </div>
        )}
        {rest > 0 ? <p>该分类下还有 {rest} 篇文章，这里只展示了最新的 {PAGE_SIZE} 篇。</p> : null}
      </section>
    </section>
  );
}
