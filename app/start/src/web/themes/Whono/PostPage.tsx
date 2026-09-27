'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import PostContent from '@/components/blog/PostContent';
import CommentList from '@/components/blog/CommentList';
import PostNavigation from '@/components/blog/PostNavigation';
import TableOfContents from '@/components/blog/TableOfContents';
import AISummary from '@/components/blog/AISummary';
import VideoPostBody from '@/components/blog/VideoPostBody';
import { formatDateInTimeZone, resolveSiteTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import { IconBookClosed, IconBookOpen } from './Icons';
import { readStoredReading, setReadingMode } from './utils';

export default function PostPage({ post, options }: { post: any; options?: Record<string, string> }) {
  const [immersive, setImmersive] = useState(false);

  // 阅读模式偏好跟着人走：进来时恢复，离开文章页时清掉，
  // 免得首页 / 归档页也被拖进沉浸布局。
  useEffect(() => {
    const stored = readStoredReading();
    if (stored === 'immersive') {
      setImmersive(true);
      setReadingMode('immersive');
    }
    return () => {
      delete document.body.dataset.whonoReading;
    };
  }, []);

  const toggleReader = () => {
    const next = !immersive;
    setImmersive(next);
    setReadingMode(next ? 'immersive' : 'normal');
  };

  const timeZone = resolveSiteTimeZone(options);
  const date = formatDateInTimeZone(
    postDateInput(post),
    'zh-CN',
    { year: 'numeric', month: 'long', day: 'numeric' },
    timeZone,
  );
  const wordCount = Number(post?.word_count || 0);
  const readMinutes = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 300)) : 0;
  const tags: { id: number; name: string; slug: string }[] = post?.tags || [];
  const categories: { id: number; name: string; slug: string }[] = post?.categories || [];

  return (
    <article className="wh-article">
      <button type="button" className="wh-reader-exit" onClick={toggleReader} aria-pressed={immersive}>
        <IconBookClosed />
        <span>退出阅读模式</span>
      </button>

      <header className="wh-article-header">
        <nav className="wh-breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          {categories.map((category) => (
            <span key={category.id}>
              {' / '}
              <Link href={`/categories/${encodeURIComponent(category.slug)}`}>{category.name}</Link>
            </span>
          ))}
        </nav>

        <h1 className="wh-article-title">{post.title}</h1>

        <p className="wh-meta">
          <time>{date}</time>
          {' · '}
          {Number(post?.view_count || 0)} 次阅读
          {' · '}
          {Number(post?.comment_count || 0)} 条评论
          {readMinutes > 0 ? ` · 约 ${readMinutes} 分钟` : ''}
        </p>

        <button
          type="button"
          className="wh-reader-enter"
          onClick={toggleReader}
          aria-pressed={immersive}
        >
          <IconBookOpen />
          <span>阅读模式</span>
        </button>
      </header>

      {post?.cover_url && post?.type !== 'video' ? (
        <img className="wh-article-cover" src={post.cover_url} alt="" />
      ) : null}

      {post?.type === 'video' ? <VideoPostBody post={post} /> : null}

      <div className="wh-toc-slot">
        <TableOfContents content={post?.content || ''} />
      </div>

      <AISummary postId={post?.id} aiSummary={post?.ai_summary} excerpt={post?.excerpt} />

      <div className="wh-prose">
        <PostContent content={post?.content || ''} />
      </div>

      {tags.length ? (
        <nav className="wh-article-tags" aria-label="文章标签">
          {tags.map((tag) => (
            <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.slug)}`}>
              #{tag.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <PostNavigation postId={post?.id} />

      <section className="wh-comments" aria-label="评论">
        <CommentList postId={post?.id} />
      </section>
    </article>
  );
}
