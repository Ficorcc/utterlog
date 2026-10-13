'use client';

import { coverProps } from '@/lib/blog-image';
import { useThemeContext } from '@/lib/theme-context';
import { formatDateInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import PostLink from '@/components/blog/PostLink';

export default function PostCard({ post, priority }: { post: any; priority?: boolean }) {
  const { timeZone } = useThemeContext();
  const date = formatDateInTimeZone(postDateInput(post), 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }, timeZone);
  const cover = post.cover_url;
  return <PostLink post={post} className="ember-card-link"><article className={`ember-card${cover ? ' has-cover' : ''}`}>
    <div className="ember-card-copy"><div className="ember-card-meta"><time>{date}</time>{post.categories?.[0] && <span>{post.categories[0].name}</span>}</div><h2>{post.title}</h2>{post.excerpt && <p>{post.excerpt}</p>}<div className="ember-card-stats">{post.view_count > 0 && <span>{post.view_count} 阅读</span>}{post.comment_count > 0 && <span>{post.comment_count} 评论</span>}</div></div>
    {cover && <div className="ember-card-cover"><img {...coverProps({ src: cover, alt: post.title, priority })} /></div>}
  </article></PostLink>;
}
