'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import { useThemeContext } from '@/lib/theme-context';
import { buildPermalink } from '@/lib/permalink';
import { IconArrowLeft, IconArrowRight } from './Icons';

/**
 * 文章底部：上一篇 / 下一篇。
 *
 * DOM 契约对齐原主题 post.php 的 .post-nav：
 *   .post-nav
 *     a.post-nav-item.post-nav-prev
 *       span.post-nav-label  （「‹ 上一篇」）
 *       span.post-nav-title
 *     a.post-nav-item.post-nav-next
 *       span.post-nav-label  （「下一篇 ›」）
 *       span.post-nav-title
 *
 * 原站是左右并排的两张玻璃卡，没有缩略图；标签在卡的顶部，
 * 标题在下方，右侧那张右对齐。样式全部由 styles.css 的 .post-nav* 规则负责，
 * 这里只负责结构与数据。
 */

interface NavPost {
  id: number;
  title?: string;
  slug?: string;
  published_at?: string | number | null;
  created_at?: string | number;
  categories?: { id: number; name: string; slug: string }[];
}

export default function PostNav({ postId }: { postId: number }) {
  const { options } = useThemeContext();
  const [nav, setNav] = useState<{ prev: NavPost | null; next: NavPost | null }>({
    prev: null,
    next: null,
  });

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    fetch(`/api/v1/posts/${postId}/navigation`)
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        const data = res.data || res;
        setNav({ prev: data?.prev || null, next: data?.next || null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const hrefOf = (post: NavPost) =>
    buildPermalink(
      {
        id: post.id,
        slug: post.slug,
        published_at: post.published_at,
        created_at: post.created_at,
        categories: post.categories,
      },
      options?.permalink_structure,
    );

  // 边界态（已是最早 / 已是最新）：原站 CSS 预留了 .post-nav-empty，
  // 用同一张卡占位，右对齐 / 左对齐的版式才不会塌掉。
  const empty = (side: 'prev' | 'next') => (
    <div className={`post-nav-item post-nav-${side} post-nav-empty`} aria-hidden="true">
      <span className="post-nav-label">
        {side === 'prev' ? (
          <>
            <IconArrowLeft size={11} /> 上一篇
          </>
        ) : (
          <>
            下一篇 <IconArrowRight size={11} />
          </>
        )}
      </span>
      <span className="post-nav-title">{side === 'prev' ? '已经是第一篇' : '已经是最新一篇'}</span>
    </div>
  );

  return (
    <div className="post-nav">
      {nav.prev ? (
        <Link href={hrefOf(nav.prev)} className="post-nav-item post-nav-prev">
          <span className="post-nav-label">
            <IconArrowLeft size={11} /> 上一篇
          </span>
          <span className="post-nav-title">{nav.prev.title}</span>
        </Link>
      ) : (
        empty('prev')
      )}
      {nav.next ? (
        <Link href={hrefOf(nav.next)} className="post-nav-item post-nav-next">
          <span className="post-nav-label">
            下一篇 <IconArrowRight size={11} />
          </span>
          <span className="post-nav-title">{nav.next.title}</span>
        </Link>
      ) : (
        empty('next')
      )}
    </div>
  );
}
