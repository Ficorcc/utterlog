import { useEffect, useState } from 'react';
import PostLink from '@/components/blog/PostLink';
import FadeCover from '@/components/blog/FadeCover';
import { randomCoverUrl } from '@/lib/blog-image';
import { useThemeContext } from '@/lib/theme-context';
import { postDateInput } from '@/lib/post-date';
import { datePartsInTimeZone } from '@/lib/timezone';

interface OtdPost {
  id: number;
  title: string;
  slug?: string;
  cover_url?: string | null;
  published_at?: string | number | null;
  created_at?: string | number | null;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

// 「往年今天」：与当前文章同月同日发布的历史文章。卡片直接复用
// 上一篇/下一篇导航的 post-prev-next 体系（封面全出血 + 黑纱 + 白字），
// 保持同一视觉语言；没有命中就整个不渲染。
export default function OnThisDay({ postId }: { postId?: number }) {
  const { options, timeZone } = useThemeContext();
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
      <div className="post-prev-next">
        {posts.map((post) => {
          const parts = datePartsInTimeZone(postDateInput(post), timeZone);
          const yearsAgo = thisYear - parts.year;
          return (
            <PostLink key={post.id} post={{ ...post, created_at: post.created_at ?? undefined }} className="post-prev-next-link prev cover-zoom">
              <div className="post-prev-next-text">
                <span className="post-prev-next-label">
                  <i className="fa-regular fa-clock" style={{ fontSize: '12px' }} />
                  {yearsAgo > 0 ? `${yearsAgo} 年前的今天 · ${parts.year}.${pad2(parts.month)}.${pad2(parts.day)}` : '今天发布'}
                </span>
                <span className="post-prev-next-title">{post.title}</span>
              </div>
              <div className="post-prev-next-cover">
                <FadeCover src={post.cover_url || randomCoverUrl(post.id, options)} />
              </div>
            </PostLink>
          );
        })}
      </div>
    </section>
  );
}
