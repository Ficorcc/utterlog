'use client';

import PostLink from '@/components/blog/PostLink';
import Link from '@/components/AppLink';
import { coverProps } from '@/lib/blog-image';
import { useThemeContext } from '@/lib/theme-context';
import { categoryHref, coverOf, excerptOf, firstCategory, postDateTimeLabel } from './utils';

export default function PostCard({ post, priority }: { post: any; priority?: boolean }) {
  const { timeZone } = useThemeContext();
  const cover = coverOf(post);
  const category = firstCategory(post);
  const published = postDateTimeLabel(post, timeZone);

  return (
    <article className={`home-card home-card--post post-card${cover ? ' has-cover' : ''}`}>
      {cover ? (
        <PostLink post={post} className="home-card-media home-post-cover" aria-label={post.title}>
          <img {...coverProps({ src: cover, alt: post.title, priority })} />
        </PostLink>
      ) : null}
      {category ? (
        <Link prefetch={false} href={categoryHref(category)} className="home-post-category">
          <i className={category.icon} aria-hidden="true" />
          <span>{category.name}</span>
        </Link>
      ) : null}
      <div className="home-card-body home-post-main">
        <div className="home-post-title-row">
          <h2 className="home-post-title">
            <PostLink post={post}>{post.title}</PostLink>
          </h2>
        </div>
        <div className="home-post-content-row">
          <p className="home-post-excerpt">{excerptOf(post, 180)}</p>
        </div>
      </div>
      <footer className="home-card-footer home-card-meta-bar home-post-footer">
        <div className="home-card-meta home-post-meta">
          <span className="home-post-time">
            <time className="time-tag" dateTime={String(post.published_at || post.created_at || '')}>{published}</time>
          </span>
        </div>
        <div className="home-card-actions home-post-actions">
          <span className="home-action post-view-count" aria-label="阅读数">
            <i className="fa-regular fa-eye" aria-hidden="true" />
            <span>{Number(post.view_count || 0)}</span>
          </span>
          <span className="home-action post-comment-count" aria-label="评论数">
            <i className="fa-regular fa-comment" aria-hidden="true" />
            <span>{Number(post.comment_count || 0)}</span>
          </span>
        </div>
      </footer>
    </article>
  );
}
