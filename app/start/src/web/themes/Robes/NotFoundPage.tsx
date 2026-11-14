'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { IconArrowLeft, IconHome, IconSearch } from './Icons';
import { formatDate } from './utils';

interface RandomPost {
  id: number;
  slug?: string;
  title?: string;
  cover_url?: string;
  published_at?: string | number | null;
  created_at?: string | number;
}

/**
 * 404 页：结构对齐原主题 404.php（错误码 + 搜索 + 快捷返回 + 随机文章）。
 */
export default function NotFoundPage() {
  const [random, setRandom] = useState<RandomPost[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/v1/posts/?per_page=4&order=random', { headers: { accept: 'application/json' } })
      .then((response) => response.json())
      .then((payload: any) => {
        const rows = payload?.data?.items || payload?.data?.data || payload?.data || payload?.items || [];
        if (alive && Array.isArray(rows)) setRandom(rows);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <h2 className="error-title">页面走丢了</h2>
      <p className="error-desc">你访问的页面不存在或已被删除，可能是链接有误或页面已被移除</p>
      <form className="error-search" action="/search" method="get">
        <span className="error-search-ico">
          <IconSearch size={15} />
        </span>
        <input type="text" name="q" placeholder="搜索文章…" autoComplete="off" />
      </form>
      <div className="error-actions">
        <Link href="/" className="error-btn">
          <IconHome size={14} /> 返回首页
        </Link>
        <button type="button" className="error-btn error-btn-outline" onClick={() => window.history.back()}>
          <IconArrowLeft size={14} /> 返回上页
        </button>
      </div>

      {random.length ? (
        <div className="error-recommend">
          <h3 className="error-recommend-title">随便看看</h3>
          <div className="error-recommend-grid">
            {random.map((post) => (
              <PostLink className="error-recommend-card" key={post.id} post={post}>
                {post.cover_url ? (
                  <div className="error-recommend-cover">
                    <img src={post.cover_url} alt="" loading="lazy" />
                  </div>
                ) : (
                  <div className="error-recommend-cover error-recommend-fallback">
                    <span>{String(post.title || '?').slice(0, 1)}</span>
                  </div>
                )}
                <div className="error-recommend-info">
                  <span className="error-recommend-card-title">{post.title}</span>
                  <span className="error-recommend-date">{formatDate(post.published_at || post.created_at)}</span>
                </div>
              </PostLink>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
