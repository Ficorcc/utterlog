'use client';

/**
 * ShanYing · 文章卡片
 *
 * 原主题有三种卡片形态，全部保留：
 *   - PostCard      封面卡（默认导出）：上图下文，标题区用封面主色的深墨色，
 *                   图片底部有一道渐变把图「融」进标题区。
 *   - PostCardRow   最新文章行：128px 缩略图 + 标题/摘要 + 圆形箭头。
 *   - PostCardTile  分类宫格：整块图作底、标题压左下角，悬浮时上浮换出摘要。
 */

import PostLink from '@/components/blog/PostLink';
import { coverProps, randomCoverUrl } from '@/lib/blog-image';
import { useThemeContext } from '@/lib/theme-context';
import { formatDateInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import {
  catIconClass,
  excerptOf,
  plainText,
  useCoverTone,
  useReveal,
} from './shanying-shared';

function useCover(post: any, options?: Record<string, string>) {
  return post?.cover_url || randomCoverUrl(post?.id, options);
}

function DateText({ post }: { post: any }) {
  const { timeZone } = useThemeContext();
  const date = formatDateInTimeZone(postDateInput(post), 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }, timeZone);
  return <time dateTime={String(postDateInput(post))}>{date.replace(/\//g, '.')}</time>;
}

/* ── 封面卡 ───────────────────────────────────────────────────── */

export default function PostCard({ post, index }: { post: any; index?: number }) {
  const { options, timeZone } = useThemeContext();
  const { ref, pending } = useReveal<HTMLElement>();
  const cover = useCover(post, options);
  const tone = useCoverTone(cover);
  const category = post?.categories?.[0];
  const excerpt = excerptOf(post, 36);
  const locked = Boolean(post?.password_protected);

  if (!post?.title) return null;

  return (
    <article
      ref={ref}
      className="sy-cover-card"
      data-pending={pending ? '1' : undefined}
      data-index={index}
      style={{ ['--sy-card-tone' as any]: tone }}
    >
      <PostLink post={post} className="sy-cover-card-image" aria-hidden="true" tabIndex={-1}>
        {cover ? <img {...coverProps({ src: cover, alt: '' })} /> : <span className="sy-cover-card-blank" />}
      </PostLink>

      {category && <span className="sy-cover-card-category">{category.name}</span>}

      <div className="sy-cover-card-body">
        <div className="sy-cover-card-meta">
          <DateText post={post} />
          <span><i className="fa-regular fa-comment" aria-hidden="true" />{post.comment_count || 0}</span>
          <span aria-hidden="true"><i className="fa-regular fa-arrow-up-right" /></span>
        </div>
        <h2 className="sy-cover-card-title">
          {/* prefetch：鼠标移上去就预取文章路由的 chunk 与数据，点击即开。
              loader 已按 preload 区分，预取不会让阅读量 +1。 */}
          <PostLink post={post} prefetch>{post.title}</PostLink>
        </h2>
        {excerpt && <p className="sy-cover-card-excerpt">{locked ? '这篇文章受密码保护。' : excerpt}</p>}
      </div>
      <span className="sy-sr-only">{timeZone}</span>
    </article>
  );
}

/* ── 最新文章行 ───────────────────────────────────────────────── */

export function PostCardRow({ post }: { post: any }) {
  const { options } = useThemeContext();
  const { ref, pending } = useReveal<HTMLElement>();
  const cover = useCover(post, options);
  const category = post?.categories?.[0];

  if (!post?.title) return null;

  return (
    <article ref={ref} className="sy-recent-row" data-pending={pending ? '1' : undefined}>
      <PostLink post={post} className="sy-recent-row-image" aria-hidden="true" tabIndex={-1}>
        {cover
          ? <img {...coverProps({ src: cover, alt: '' })} />
          : <span className="sy-recent-row-blank"><i className={catIconClass(category)} aria-hidden="true" /></span>}
      </PostLink>

      <div className="sy-recent-row-copy">
        <div className="sy-recent-row-meta">
          {category && <span>{category.name}</span>}
          <DateText post={post} />
        </div>
        <h2>
          <PostLink post={post}>{post.title}</PostLink>
        </h2>
      </div>

      <span className="sy-recent-row-arrow" aria-hidden="true">
        <i className="fa-regular fa-arrow-up-right" />
      </span>
    </article>
  );
}

/* ── 分类宫格 ─────────────────────────────────────────────────── */

export function PostCardTile({ post }: { post: any }) {
  const { options } = useThemeContext();
  const { ref, pending } = useReveal<HTMLElement>();
  const cover = useCover(post, options);
  const tone = useCoverTone(cover);
  const excerpt = excerptOf(post, 60);

  if (!post?.title) return null;

  return (
    <article
      ref={ref}
      className="sy-cover-card sy-cover-card--tile"
      data-pending={pending ? '1' : undefined}
      style={{ ['--sy-card-tone' as any]: tone }}
    >
      <PostLink post={post} className="sy-cover-card-image" aria-hidden="true" tabIndex={-1}>
        {cover ? <img {...coverProps({ src: cover, alt: '' })} /> : <span className="sy-cover-card-blank" />}
      </PostLink>

      <div className="sy-card-corners">
        <DateText post={post} />
        <span><i className="fa-regular fa-comment" aria-hidden="true" />{post.comment_count || 0}</span>
      </div>

      <div className="sy-cover-card-body">
        <h3 className="sy-cover-card-title">
          <PostLink post={post}>{post.title}</PostLink>
        </h3>
        {excerpt && <p className="sy-card-hover-summary" aria-hidden="true">{excerpt}</p>}
      </div>
    </article>
  );
}

/** 供需要纯文本摘要的地方复用（例如 Hero 的最新说说）。 */
export { plainText };
