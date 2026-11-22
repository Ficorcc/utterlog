'use client';

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import {
  cardDateLabel,
  categoriesOf,
  categoryHref,
  commentCountOf,
  coverOf,
  excerptOf,
  viewCountOf,
} from './utils';

/**
 * 列表卡片。
 *
 * 上游结构（template-parts/content.php）：
 *   有封面：article.post-card.post-card-has-image.glaze-panel
 *              ├─ div.post-card-cover
 *              │   ├─ a.post-card-image > img
 *              │   └─ div.post-card-heading（标题 + 分类）
 *              └─ div.post-card-copy（摘要 + 页脚）
 *   无封面：article.post-card.glaze-panel
 *              └─ div.post-card-copy
 *                  ├─ div.post-card-heading
 *                  ├─ div.post-excerpt
 *                  └─ div.post-card-footer
 */
export default function PostCard({ post }: { post: any }) {
  const { timeZone } = useThemeContext();
  const cover = coverOf(post);
  const categories = categoriesOf(post);
  const comments = commentCountOf(post);
  const views = viewCountOf(post);
  const published = post?.published_at || post?.created_at || '';

  const heading = (
    <div className="post-card-heading">
      <h2 className="post-card-title">
        <span className="post-card-title-mark" aria-hidden="true">#</span>
        <PostLink post={post}>{post?.title || '无标题'}</PostLink>
      </h2>
      {categories.length ? (
        <span className="post-meta-categories">
          {categories.map((category) => (
            <Link key={category.slug || category.name} href={categoryHref(category)} prefetch={false}>
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
        <time className="post-card-date" dateTime={String(published)}>
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
        <a className="post-card-comment-group t-avatar-group" href="#comments" aria-label={`${comments} 条评论`}>
          <span className="post-card-comment-count t-avatar">
            <i className="fa-regular fa-comment" aria-hidden="true" />
            <span>{comments > 999 ? '999+' : comments}</span>
          </span>
        </a>
      ) : null}
    </div>
  );

  if (cover) {
    return (
      <article id={`post-${post?.id}`} className="post-card post-card-has-image glaze-panel">
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
    <article id={`post-${post?.id}`} className="post-card glaze-panel">
      <div className="post-card-copy">
        {heading}
        <div className="post-excerpt">{excerptOf(post, 180)}</div>
        {footer}
      </div>
    </article>
  );
}
