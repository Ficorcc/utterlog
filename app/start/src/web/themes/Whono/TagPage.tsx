'use client';

import Link from '@/components/AppLink';
import PostCard from './PostCard';

/** 标签页：标题 + 文章数 + 该标签下的文章列表。 */
export default function TagPage({ tag, posts = [] }: { tag: any; posts?: any[]; timeZone?: string }) {
  const name = tag?.name || '标签';
  const list = Array.isArray(posts) ? posts : [];

  return (
    <>
      <div className="wh-page-header">
        <h1 className="wh-page-title">#{name}</h1>
        <p className="wh-page-subtitle">{list.length} 篇文章</p>
      </div>

      <div className="wh-list">
        {list.length ? (
          list.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="wh-empty">
            这个标签还没有文章，去 <Link href="/archives">归档</Link> 看看别的吧。
          </p>
        )}
      </div>

      <nav className="wh-pagination">
        <Link className="wh-page-link" href="/tags">
          ‹ 全部标签
        </Link>
      </nav>
    </>
  );
}
