'use client';

import PostCard from './PostCard';

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

/**
 * 分类 / 标签页共用一套列表排版 —— 原主题里分类、标签、归档都走同一份
 * index.php（只有首页才带 Hero），这里保持一致。
 */
export function PostList({ posts, emptyText }: { posts: ListPost[]; emptyText: string }) {
  const list = Array.isArray(posts) ? posts : [];
  if (!list.length) {
    return (
      <div className="post-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
        {emptyText}
      </div>
    );
  }
  return (
    <>
      {list.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}

export default function CategoryPage({
  category,
  posts,
}: {
  category: { id?: number; name?: string; slug?: string; description?: string; count?: number };
  posts: ListPost[];
}) {
  return (
    <>
      <div className="page-banner">
        <span className="gb-badge">分类</span>
        <h1 className="gb-title">{category?.name || '未分类'}</h1>
        {category?.description ? <p className="gb-sub">{category.description}</p> : null}
        <p className="gb-sub">共 {posts?.length || 0} 篇文章</p>
      </div>
      <PostList posts={posts} emptyText="这个分类下还没有文章" />
    </>
  );
}
