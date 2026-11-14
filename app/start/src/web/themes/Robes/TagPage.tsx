'use client';

import { PostList } from './CategoryPage';

interface ListPost {
  id: number;
  slug?: string;
  title?: string;
  excerpt?: string;
  cover_url?: string;
  view_count?: number;
  comment_count?: number;
  word_count?: number;
  published_at?: string | number | null;
  created_at?: string | number;
  categories?: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
}

export default function TagPage({
  tag,
  posts,
}: {
  tag: { id?: number; name?: string; slug?: string; count?: number };
  posts: ListPost[];
}) {
  return (
    <>
      <div className="page-banner">
        <span className="gb-badge">标签</span>
        <h1 className="gb-title">#{tag?.name || '未命名'}</h1>
        <p className="gb-sub">共 {posts?.length || 0} 篇文章</p>
      </div>
      <PostList posts={posts} emptyText="这个标签下还没有文章" />
    </>
  );
}
