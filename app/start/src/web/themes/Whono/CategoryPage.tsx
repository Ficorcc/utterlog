'use client';

import Link from '@/components/AppLink';
import PostCard from './PostCard';

/** 分类页：标题 + 文章数 + 该分类下的文章列表。 */
export default function CategoryPage({
  category,
  posts = [],
}: {
  category: any;
  posts?: any[];
  timeZone?: string;
}) {
  const name = category?.name || '分类';
  const list = Array.isArray(posts) ? posts : [];

  return (
    <>
      <div className="wh-page-header">
        <h1 className="wh-page-title">{name}</h1>
        <p className="wh-page-subtitle">{list.length} 篇文章</p>
      </div>

      {category?.description ? <p className="wh-intro">{category.description}</p> : null}

      <div className="wh-list">
        {list.length ? (
          list.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="wh-empty">
            这个分类还没有文章，去 <Link href="/archives">归档</Link> 看看别的吧。
          </p>
        )}
      </div>

      <nav className="wh-pagination">
        <Link className="wh-page-link" href="/categories">
          ‹ 全部分类
        </Link>
      </nav>
    </>
  );
}
