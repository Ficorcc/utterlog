'use client';

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { formatDateInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

interface ArchivePost {
  id: number;
  title?: string;
  tags?: { id: number; name: string; slug: string }[];
  published_at?: string | number | null;
  created_at?: string | number;
}

interface ArchiveProps {
  posts: ArchivePost[];
  categories?: unknown[];
  tags?: unknown[];
  stats?: { post_count?: number };
  timeZone?: string;
}

interface Row {
  post: ArchivePost;
  date: string;
  tag?: string;
}

/**
 * 归档页：沿用 whono 的「日期 / 标题 / 标签」三栏行式布局，
 * 按年份分组，年份之间用区块标题分隔。
 */
export default function ArchivePage({ posts, timeZone: timeZoneProp }: ArchiveProps) {
  const { timeZone: ctxTimeZone } = useThemeContext();
  const timeZone = timeZoneProp || ctxTimeZone;
  const list = Array.isArray(posts) ? posts : [];

  const groups = new Map<string, Row[]>();
  for (const post of list) {
    const date = formatDateInTimeZone(
      postDateInput(post),
      'zh-CN',
      { year: 'numeric', month: '2-digit', day: '2-digit' },
      timeZone,
    );
    const year = date.slice(0, 4);
    const rows = groups.get(year) || [];
    rows.push({ post, date, tag: post.tags?.[0]?.name });
    groups.set(year, rows);
  }

  const years = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <>
      <div className="wh-page-header">
        <h1 className="wh-page-title">归档</h1>
        <p className="wh-page-subtitle">共 {list.length} 篇</p>
      </div>

      {years.length ? (
        years.map((year) => (
          <section key={year}>
            <h2 className="wh-section-title">{year}</h2>
            <div className="wh-list">
              {(groups.get(year) || []).map((row) => (
                <PostLink key={row.post.id} post={row.post} className="wh-archive-row">
                  <span className="wh-archive-date">{row.date}</span>
                  <span className="wh-archive-title">{row.post.title || '无标题'}</span>
                  <span className="wh-archive-tag">{row.tag ? `#${row.tag}` : ''}</span>
                </PostLink>
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="wh-empty">还没有可以归档的内容。</p>
      )}

      <nav className="wh-pagination">
        <Link className="wh-page-link" href="/">
          ‹ 返回首页
        </Link>
      </nav>
    </>
  );
}
