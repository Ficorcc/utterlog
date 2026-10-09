'use client';

/** ShanYing · 标签页 */

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { coverProps, randomCoverUrl } from '@/lib/blog-image';
import { postDateInput } from '@/lib/post-date';
import { useThemeContext } from '@/lib/theme-context';
import { formatDateInTimeZone } from '@/lib/timezone';
import { useMemo, useState } from 'react';
import { excerptOf } from './shanying-shared';

export default function TagPage({
  tag,
  posts = [],
  timeZone = 'UTC',
}: {
  tag: any;
  posts?: any[];
  timeZone?: string;
}) {
  const name = tag?.name || '标签';
  const { options } = useThemeContext();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return posts;
    return posts.filter((post: any) => {
      const text = `${post?.title || ''} ${excerptOf(post, 200)}`.toLocaleLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [normalizedQuery, posts]);

  return (
    <section className="sy-tag-browser">
      <header className="sy-tag-browser-head">
        <div>
          <p className="sy-tag-browser-kicker">TOPIC / 关键词</p>
          <h1><i className="fa-solid fa-hashtag" aria-hidden="true" />{name}</h1>
        </div>
        <label className="sy-tag-search">
          <span className="sy-sr-only">在当前标签中搜索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章…"
          />
          <i className="fa-regular fa-magnifying-glass" aria-hidden="true" />
        </label>
      </header>

      <div className="sy-tag-browser-count">
        <span>共 <strong>{filteredPosts.length}</strong> 篇内容</span>
        <span>{normalizedQuery ? `“${query.trim()}” 的搜索结果` : '按发布时间排列'}</span>
      </div>

      {filteredPosts.length === 0 ? (
        <p className="sy-tag-browser-empty">
          {normalizedQuery
            ? '没有找到匹配的文章，换个关键词试试。'
            : <>这个标签还没有文章，去 <Link prefetch={false} href="/archives">归档</Link> 看看别的吧。</>}
        </p>
      ) : (
        <div className="sy-tag-results">
          {filteredPosts.map((post: any) => {
            const category = post?.categories?.[0];
            const cover = post?.cover_url || randomCoverUrl(post?.id, options);
            const excerpt = excerptOf(post, 110);
            const date = formatDateInTimeZone(postDateInput(post), 'zh-CN', {
              year: 'numeric', month: '2-digit', day: '2-digit',
            }, timeZone).replace(/\//g, '.');
            return (
              <article className="sy-tag-row" key={post.id}>
                <div className="sy-tag-row-copy">
                  <div className="sy-tag-row-meta">
                    <time dateTime={String(postDateInput(post))}>{date}</time>
                    {category && <span>{category.name}</span>}
                  </div>
                  <h2><PostLink post={post} prefetch>{post.title}</PostLink></h2>
                  {excerpt && <p>{excerpt}</p>}
                </div>
                <PostLink post={post} className="sy-tag-row-image" aria-hidden="true" tabIndex={-1}>
                  {cover ? <img {...coverProps({ src: cover, alt: '' })} /> : <span />}
                </PostLink>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
