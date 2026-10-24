import { useEffect, useState } from 'react';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { postDateInput } from '@/lib/post-date';
import { datePartsInTimeZone, formatDateInTimeZone } from '@/lib/timezone';

interface OtdPost {
  id: number;
  title: string;
  slug?: string;
  published_at?: string | number | null;
  created_at?: string | number | null;
}

// 「往年今天」：拉取与当前文章同月同日发布的历史文章，
// 没有命中就整个不渲染，不占版面。
export default function OnThisDay({ postId }: { postId?: number }) {
  const { timeZone } = useThemeContext();
  const [posts, setPosts] = useState<OtdPost[] | null>(null);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    fetch(`/api/v1/posts/${postId}/on-this-day`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => { if (!cancelled) setPosts(r?.data?.posts || []); })
      .catch(() => { if (!cancelled) setPosts([]); });
    return () => { cancelled = true; };
  }, [postId]);

  if (!posts || posts.length === 0) return null;
  const thisYear = new Date().getFullYear();

  return (
    <section className="sy-otd" aria-label="往年今天">
      <header className="sy-related-heading">
        <div>
          <p className="sy-kicker">ON THIS DAY</p>
          <h2>往年今天</h2>
        </div>
      </header>
      <div className="sy-otd-list">
        {posts.map((post) => {
          const parts = datePartsInTimeZone(postDateInput(post), timeZone);
          const yearsAgo = thisYear - parts.year;
          return (
            <PostLink key={post.id} post={post} className="sy-otd-item">
              <span className="sy-otd-badge">{yearsAgo > 0 ? `${yearsAgo} 年前` : '今天'}</span>
              <span className="sy-otd-title">{post.title}</span>
              <span className="sy-otd-date">
                {formatDateInTimeZone(postDateInput(post), 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }, timeZone)}
              </span>
              <i className="fa-regular fa-arrow-right sy-otd-arrow" aria-hidden="true" />
            </PostLink>
          );
        })}
      </div>
    </section>
  );
}
