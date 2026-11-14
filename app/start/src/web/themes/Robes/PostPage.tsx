'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import PostContent from '@/components/blog/PostContent';
import CommentList from '@/components/blog/CommentList';
import PostNavigation from '@/components/blog/PostNavigation';
import TableOfContents from '@/components/blog/TableOfContents';
import AISummary from '@/components/blog/AISummary';
import VideoPostBody from '@/components/blog/VideoPostBody';
import {
  IconCalendar,
  IconChat,
  IconEye,
  IconFileText,
  IconHeart,
  IconTime,
} from './Icons';
import { formatLongDate, readMinutes } from './utils';

interface PostData {
  id: number;
  title?: string;
  excerpt?: string;
  content?: string;
  cover_url?: string;
  type?: string;
  view_count?: number;
  comment_count?: number;
  word_count?: number;
  published_at?: string | number | null;
  created_at?: string | number;
  categories?: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
}

const LIKE_KEY = 'robes-likes';

function readLikes(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LIKE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * 文章页：顶部 Hero（分类 / 标题 / 元信息）、目录、正文、点赞、标签、上下篇、评论。
 * 结构对齐原主题 post.php + comments.php。
 */
export default function PostPage({ post }: { post: PostData; options?: Record<string, string> }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    const likes = readLikes();
    const key = String(post?.id || '');
    setLiked(Boolean(likes[key]));
    setLikeCount(Object.values(likes).filter(Boolean).length);
  }, [post?.id]);

  const toggleLike = () => {
    const key = String(post?.id || '');
    const likes = readLikes();
    const next = !likes[key];
    if (next) likes[key] = true;
    else delete likes[key];
    try {
      localStorage.setItem(LIKE_KEY, JSON.stringify(likes));
    } catch {
      /* 隐私模式下写不进去，界面仍然切换 */
    }
    setLiked(next);
    setLikeCount(Object.values(likes).filter(Boolean).length);
  };

  const categories = post?.categories || [];
  const tags = post?.tags || [];
  const minutes = readMinutes(post?.word_count);

  return (
    <>
      <article className="article">
        <div className="article-hero">
          {post?.cover_url ? (
            <img className="article-hero-bg" src={post.cover_url} alt="" loading="eager" decoding="async" />
          ) : null}
          <div className="article-hero-scrim" />
          <div className="article-hero-content">
            <div className="article-hero-kicker">
              {categories.length ? categories.map((category) => category.name).join(' · ') : '文章'}
            </div>
            <div className="article-title-row">
              <h1 className="article-title">{post?.title}</h1>
            </div>
            <div className="article-meta">
              <span className="article-meta-item">
                <IconCalendar size={13} />
                {formatLongDate(post?.published_at || post?.created_at)}
              </span>
              <span className="article-meta-item">
                <IconEye size={13} />
                {Number(post?.view_count || 0)} 阅读
              </span>
              <span className="article-meta-item">
                <IconChat size={13} />
                {Number(post?.comment_count || 0)} 评论
              </span>
              <span className="article-meta-item">
                <IconTime size={13} />
                约 {minutes} 分钟
              </span>
              <span className="article-meta-item">
                <IconFileText size={13} />
                {Number(post?.word_count || 0)} 字
              </span>
            </div>
          </div>
        </div>

        <div className="toc-wrap" id="articleTOC">
          <TableOfContents content={post?.content || ''} />
        </div>

        {post?.type === 'video' ? (
          <VideoPostBody post={{ ...post, title: post?.title || '' }} />
        ) : null}

        <AISummary postId={post?.id} aiSummary={(post as any)?.ai_summary} excerpt={post?.excerpt} />

        <div className="article-content" id="articleContent">
          <PostContent content={post?.content || ''} />
        </div>

        <div className="like-wrap">
          <button type="button" className={liked ? 'like-btn is-liked' : 'like-btn'} onClick={toggleLike}>
            <IconHeart size={16} />
            <span className="like-text">{liked ? '已喜欢' : '喜欢这篇文章'}</span>
            <span className="like-count">{likeCount}</span>
          </button>
        </div>

        {tags.length ? (
          <div className="article-tags" id="articleTags">
            {tags.map((tag) => (
              <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.slug)}`}>
                #{tag.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="post-nav">
          <PostNavigation postId={post?.id} />
        </div>
      </article>

      <div id="comments">
        <CommentList postId={post?.id} formPlacement="bottom" />
      </div>
    </>
  );
}
