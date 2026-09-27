'use client';

import Link from '@/components/AppLink';
import PostCard from './PostCard';
import { useThemeContext } from '@/lib/theme-context';
import { plainText } from './utils';

interface HomePost {
  id: number;
  title?: string;
  excerpt?: string;
  cover_url?: string;
}

interface HomeProps {
  posts: HomePost[];
  page: number;
  totalPages: number;
  categories?: unknown[];
  archiveStats?: { post_count?: number; comment_count?: number };
  latestMoment?: unknown;
  latestComments?: unknown;
  perPage?: number;
}

function pageHref(page: number) {
  return page <= 1 ? '/' : `/page/${page}`;
}

export default function HomePage({ posts, page, totalPages }: HomeProps) {
  const { site, owner, tags } = useThemeContext();
  const list = Array.isArray(posts) ? posts : [];
  const total = Math.max(1, Number(totalPages) || 1);
  const hero = list.find((post) => post?.cover_url)?.cover_url;
  const intro = site.description || owner.bio || '';
  const hotTags = (tags || []).filter((tag) => tag.count > 0).slice(0, 16);

  return (
    <>
      {hero ? (
        <div className="wh-hero">
          <img src={hero} alt="" loading="eager" fetchPriority="high" />
        </div>
      ) : null}

      {intro ? <p className="wh-intro">{plainText(intro)}</p> : null}

      <div className="wh-page-header">
        <h1 className="wh-page-title">文章</h1>
        <p className="wh-page-subtitle">{list.length ? `第 ${page} / ${total} 页` : '还没有发布内容'}</p>
      </div>

      <div className="wh-list">
        {list.length ? (
          list.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="wh-empty">这里还空着，写点什么吧。</p>
        )}
      </div>

      {total > 1 ? (
        <nav className="wh-pagination" aria-label="分页">
          {page > 1 ? (
            <Link className="wh-page-link" href={pageHref(page - 1)} rel="prev">
              ‹ 上一页
            </Link>
          ) : null}
          <span className="wh-page-indicator">
            {page} / {total}
          </span>
          {page < total ? (
            <Link className="wh-page-link wh-page-link--next" href={pageHref(page + 1)} rel="next">
              下一页 ›
            </Link>
          ) : null}
        </nav>
      ) : null}

      {hotTags.length ? (
        <nav className="wh-article-tags" aria-label="关键词" style={{ marginTop: 36 }}>
          {hotTags.map((tag) => (
            <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.slug)}`}>
              #{tag.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
