'use client';

import { useEffect, useState } from 'react';
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

/** 首页头图兜底：主题自带一张，可在后台主题选项 whono_hero 里替换。 */
const DEFAULT_HERO = '/themes/Whono/hero.webp';

/** 随机占位图（picsum.photos，带固定 seed 前缀方便排查）。 */
function randomHero() {
  return `https://picsum.photos/seed/whono${Math.floor(Math.random() * 900) + 100}/1200/480`;
}

export default function HomePage({ posts, page, totalPages }: HomeProps) {
  const { site, owner, options } = useThemeContext();
  const list = Array.isArray(posts) ? posts : [];
  const total = Math.max(1, Number(totalPages) || 1);

  // 头图优先级：主题选项指定 → 首篇有封面的文章 → 随机占位图
  const hero =
    options.whono_hero ||
    list.find((post) => post?.cover_url)?.cover_url ||
    DEFAULT_HERO;

  // 没有指定图时，挂载后换一张随机占位图（SSR 首帧仍用默认图，避免水合不一致）
  const [heroSrc, setHeroSrc] = useState(hero);
  useEffect(() => {
    setHeroSrc(hero === DEFAULT_HERO ? randomHero() : hero);
  }, [hero]);

  const intro = site.description || owner.bio || '';

  return (
    <>
      {hero ? (
        <div className="wh-hero">
          <img
            src={heroSrc}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={() => setHeroSrc(DEFAULT_HERO)}
          />
        </div>
      ) : null}

      {intro ? <p className="wh-intro">{plainText(intro)}</p> : null}

      <h2 className="wh-section-title wh-section-title--index">索引</h2>

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
    </>
  );
}
