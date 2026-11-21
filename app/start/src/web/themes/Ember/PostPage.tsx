'use client';

import Link from '@/components/AppLink';
import PostContent from './PostContent';
import TableOfContents from './TableOfContents';
import AISummary from './AISummary';
import PostNavigation from './PostNavigation';
import CommentSection from './CommentSection';
import VideoPostBody from '@/components/blog/VideoPostBody';
import { resolveSiteTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import { categoryHref, coverOf, firstCategory, postDateTimeLabel, postMonthDay } from './utils';

export default function PostPage({ post, options }: { post: any; options?: Record<string, string> }) {
  const timeZone = resolveSiteTimeZone(options);
  const displayDate = postDateInput(post);
  const cover = coverOf(post);
  const category = firstCategory(post);
  const { month, day } = postMonthDay({ published_at: displayDate }, timeZone);
  const publishedFull = postDateTimeLabel(post, timeZone);
  const commentCount = Number(post.comment_count || 0);

  const scrollToComments = () => {
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    // 外层 relative 包裹：TOC 用 absolute 定位在卡片右侧空白区
    <div style={{ position: 'relative' }}>
      <article className={`post-detail${cover ? ' has-cover' : ''}`}>
        <div className="post-body-card post-detail-card">
          <header className="post-hero-card">
            {cover ? (
              <div className="post-cover">
                <img src={cover} alt={post.title} loading="lazy" decoding="async" draggable={false} />
              </div>
            ) : null}
            <div className="post-hero-title">
              <h1 className="post-title">
                {post.is_top ? <span className="badge badge-top">置顶</span> : null}
                {post.title}
              </h1>
            </div>
          </header>

          <div className="post-detail-content">
            <aside className="post-side-stats" aria-label="文章数据">
              <time className="post-side-stat post-side-stat--date" dateTime={String(displayDate)} title={publishedFull}>
                <span className="post-side-date">
                  <span>{month}</span>
                  <span>{day}</span>
                </span>
              </time>
              {category ? (
                <Link prefetch={false} href={categoryHref(category)} className="post-side-stat post-side-category" title={`分类：${category.name}`}>
                  <i className={category.icon} aria-hidden="true" />
                  <span>{category.name}</span>
                </Link>
              ) : null}
              <span className="post-side-stat" title={`${post.view_count || 0} 浏览`}>
                <i className="fa-regular fa-eye" aria-hidden="true" />
                <span>{post.view_count || 0}</span>
              </span>
              <button type="button" className="post-side-stat" title={`${commentCount} 评论`} onClick={scrollToComments}>
                <i className="fa-regular fa-comment" aria-hidden="true" />
                <span>{commentCount}</span>
              </button>
            </aside>

            {post.type === 'video' ? (
              <>
                <VideoPostBody post={post} />
                {post.content ? (
                  <div className="post-content">
                    <PostContent content={post.content} />
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <AISummary postId={post.id} aiSummary={post.ai_summary} excerpt={post.excerpt} />
                <div className="post-content">
                  <PostContent content={post.content || ''} />
                </div>
              </>
            )}

            {post.tags?.length ? (
              <div className="post-tags">
                {post.tags.map((tag: any) => (
                  <Link prefetch={false} key={tag.id} href={`/tags/${tag.slug}`} className="tag">
                    #{tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="post-license-card">
              <div className="post-license-info">
                <strong className="post-license-author">{post.author_name || '作者'}</strong>
                {category ? (
                  <span className="post-license-category">
                    发布在&nbsp;
                    <Link prefetch={false} href={categoryHref(category)} className="post-license-inline-link post-license-category-link">
                      <i className={category.icon} aria-hidden="true" />{category.name}
                    </Link>
                  </span>
                ) : null}
                <span className="post-license-terms">
                  本文采用 <i className="fa-brands fa-creative-commons" aria-hidden="true" />{' '}
                  <a className="post-license-inline-link" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">
                    CC BY-NC-SA 4.0
                  </a>&nbsp;许可协议，转载请注明来源。
                </span>
              </div>
              <span className="post-end-tag" aria-hidden="true">THE END</span>
            </div>

            <PostNavigation postId={post.id} pageSize={6} />

            <CommentSection postId={post.id} title={post.title} />
          </div>
        </div>
      </article>

      {/* TOC 浮在文章卡右侧空白区（共享 toc-styles.css） */}
      <div className="blog-toc-outer hidden xl:block">
        <TableOfContents content={post.content || ''} />
      </div>
    </div>
  );
}
