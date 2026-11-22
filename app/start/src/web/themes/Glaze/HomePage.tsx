'use client';

import Link from '@/components/AppLink';
import HomeRails from './HomeRails';
import PostCard from './PostCard';

/**
 * 首页。
 *
 * 上游结构：section.post-feed > div.post-list（卡片）+ 分页，
 * 侧轨由布局层在内容之后渲染，这里由 HomePage 自己带出。
 */
export default function HomePage({
  posts,
  page,
  totalPages,
  latestMoment,
  recentMoments,
  latestComments,
}: {
  posts: any[];
  page: number;
  totalPages: number;
  categories?: any[];
  archiveStats?: any;
  latestMoment?: any | null;
  recentMoments?: any[];
  latestComments?: any[];
  perPage?: number;
}) {
  const items = posts || [];
  const moments = recentMoments?.length ? recentMoments : latestMoment ? [latestMoment] : [];

  return (
    <>
      <section className="post-feed" aria-labelledby="latest-posts">
        <h1 id="latest-posts" className="screen-reader-text">最新文章</h1>
        {items.length ? (
          <div className="post-list">
            {items.map((post) => (
              <PostCard key={post?.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="empty-state glaze-panel">
            <p>还没有发布任何文章</p>
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="navigation" aria-label="分页">
            <div className="nav-links">
              {page > 1 ? (
                <Link className="page-numbers" href={page - 1 === 1 ? '/' : `/page/${page - 1}`} prefetch={false}>
                  上一页
                </Link>
              ) : (
                <span className="page-numbers">上一页</span>
              )}
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((num) =>
                num === page ? (
                  <span className="page-numbers current" key={num} aria-current="page">
                    {num}
                  </span>
                ) : (
                  <Link className="page-numbers" key={num} href={num === 1 ? '/' : `/page/${num}`} prefetch={false}>
                    {num}
                  </Link>
                ),
              )}
              {page < totalPages ? (
                <Link className="page-numbers" href={`/page/${page + 1}`} prefetch={false}>
                  下一页
                </Link>
              ) : (
                <span className="page-numbers">下一页</span>
              )}
            </div>
          </nav>
        ) : null}
      </section>

      <HomeRails comments={latestComments || []} moments={moments} />
    </>
  );
}
