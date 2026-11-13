'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { useLazyVisible } from '@/lib/use-lazy-visible';
import AzureProfileCard from './ProfileCard';
import CommentAvatar from '@/components/CommentAvatar';

const API = '/api/v1';

let latestCommentsCache: any[] | null = null;

import { getCategoryIcon } from './constants';

function timeAgo(ts: string | number) {
  const t = typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  return Math.floor(diff / 86400) + ' 天前';
}

export default function Sidebar({ initialComments = [] }: { initialComments?: any[] }) {
  const ctx = useThemeContext();
  const categoriesCtx = ctx.categories;
  const tagsCtx = ctx.tags
    .slice()
    .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
    .slice(0, 20);
  const stats = ctx.archiveStats;

  const [categories, setCategories] = useState<any[]>(categoriesCtx);
  const [tags, setTags] = useState<any[]>(tagsCtx);
  const [comments, setComments] = useState<any[]>(latestCommentsCache || initialComments);
  const commentsLazy = useLazyVisible<HTMLDivElement>();
  const [activeTab, setActiveTab] = useState<'latest' | 'hot' | 'random'>('latest');
  const [tabPosts, setTabPosts] = useState<any[]>([]);
  const [archiveOpen, setArchiveOpen] = useState<string | null>(null);

  useEffect(() => {
    setCategories(categoriesCtx);
    setTags(tagsCtx);
    fetchTabPosts('latest');
  }, []);

  useEffect(() => {
    if (!commentsLazy.visible || latestCommentsCache || comments.length > 0) return;
    fetch(`${API}/comments?per_page=5&status=approved&exclude_admin=1`).then(r => r.json()).then(r => {
      const all = r.data?.comments || r.data || [];
      latestCommentsCache = all;
      setComments(all);
    }).catch(() => {});
  }, [comments.length, commentsLazy.visible]);

  const fetchTabPosts = (tab: string) => {
    let url = `${API}/posts?per_page=5&status=publish`;
    if (tab === 'hot') url += '&order_by=comment_count&order=desc';
    if (tab === 'random') url += '&order_by=random&_t=' + Date.now();
    fetch(url).then(r => r.json()).then(r => setTabPosts((r.data?.posts || r.data || []).slice(0, 5))).catch(() => {});
  };

  const switchTab = (tab: 'latest' | 'hot' | 'random') => {
    setActiveTab(tab);
    fetchTabPosts(tab);
  };

  const sectionTitle = (icon: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid #e5e5e5', fontSize: '13px', fontWeight: 600, color: '#333' }}>
      <i className={icon} style={{ color: '#0052D9' }} /> {label}
    </div>
  );

  return (
    <aside style={{ width: '100%' }}>

      <AzureProfileCard />

      {/* Recent comments — clicking the row jumps to the article and
          anchors to the specific comment. PostLink builds the URL via
          the admin's permalink config (so /posts/<slug>, /<year>/<slug>,
          etc. all work) and the #comment-<id> hash matches the
          CommentList item id used in the article body. */}
      <div ref={commentsLazy.ref} style={{ borderBottom: '1px solid #e5e5e5' }}>
        {sectionTitle('fa-regular fa-comments', '最新评论')}
        {comments.map((c: any, idx: number) => (
          <PostLink
            key={c.id}
            post={{ id: c.post_id, slug: c.post_slug, title: c.post_title, categories: c.post_categories }}
            style={{
              display: 'flex', gap: '10px', padding: '10px 16px',
              borderBottom: idx < comments.length - 1 ? '1px solid #f5f5f5' : 'none',
              textDecoration: 'none', color: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background = '#f8f9fa'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <CommentAvatar
              name={c.author_name || c.author}
              candidates={c.avatar_candidates}
              src={c.avatar_url}
              size={32}
              alt=""
              shape="square"
              style={{ clipPath: 'url(#squircle)' }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{c.author_name || c.author}</span>
                <span style={{ fontSize: '11px', color: '#bbb' }}>{timeAgo(c.created_at)}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
                {c.content}
              </p>
            </div>
          </PostLink>
        ))}
      </div>

      {/* Post tabs */}
      <div style={{ borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ display: 'flex' }}>
          {[
            { key: 'latest' as const, icon: 'fa-regular fa-clock', label: '最新日志' },
            { key: 'hot' as const, icon: 'fa-solid fa-fire', label: '热评日志' },
            { key: 'random' as const, icon: 'fa-solid fa-shuffle', label: '随机日志' },
          ].map(tab => (
            <button key={tab.key} onClick={() => switchTab(tab.key)} style={{
              flex: 1, padding: '8px 0', fontSize: '11px', fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#fff' : '#666',
              background: activeTab === tab.key ? '#0052D9' : '#fafafa',
              border: 'none', borderBottom: activeTab === tab.key ? 'none' : '1px solid #e5e5e5',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}>
              <i className={tab.icon} style={{ fontSize: '10px' }} /> {tab.label}
            </button>
          ))}
        </div>
        <div>
          {tabPosts.map((post: any, idx: number) => {
            const numIcons = ['fa-solid fa-1', 'fa-solid fa-2', 'fa-solid fa-3', 'fa-solid fa-4', 'fa-solid fa-5'];
            return (
            <PostLink key={post.id} post={post} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 10px', fontSize: '13px', color: '#333',
              textDecoration: 'none', borderBottom: idx < tabPosts.length - 1 ? '1px solid #f0f0f0' : 'none',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className={`${numIcons[idx] || 'fa-solid fa-5'}`} style={{ color: idx < 3 ? '#0052D9' : '#bbb', fontSize: '12px', width: '14px', textAlign: 'center' as const, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
            </PostLink>
            );
          })}
        </div>
      </div>

      {/* Tags — colorful cloud */}
      <div style={{ borderBottom: '1px solid #e5e5e5' }}>
        {sectionTitle('fa-solid fa-tags', '关键词')}
        <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tags.map((tag, i) => {
            const colors = ['#0052D9', '#e53935', '#43a047', '#f57c00', '#8e24aa', '#00838f', '#c62828', '#1565c0', '#2e7d32', '#d84315'];
            const c = colors[i % colors.length];
            const size = tag.count > 5 ? 14 : tag.count > 2 ? 13 : 12;
            return (
              <Link key={tag.id} href={`/tags/${tag.slug}`} prefetch={false} style={{
                padding: '4px 10px', fontSize: `${size}px`,
                border: `1px solid ${c}40`, color: c, background: `${c}08`,
                textDecoration: 'none', transition: 'all 0.15s',
                fontWeight: tag.count > 3 ? 600 : 400,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = c; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = c; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${c}08`; e.currentTarget.style.color = c; e.currentTarget.style.borderColor = `${c}40`; }}
              >
                {tag.name} <span style={{ fontSize: '10px', opacity: 0.6 }}>{tag.count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Categories — full list */}
      {/* 过滤掉 0 篇文章的分类：站点新建分类还没分配文章时，留在侧栏
         看起来像"列表里有空目录"，用户要求只展示有内容的。 */}
      {(() => {
        const visibleCategories = (categories || []).filter((c: any) => (c.count || 0) > 0);
        if (visibleCategories.length === 0) return null;
        return (
      <div style={{ borderBottom: '1px solid #e5e5e5' }}>
        {sectionTitle('fa-solid fa-folder-tree', '文章分类')}
        {visibleCategories.map((cat, idx) => (
          <Link key={cat.id} href={`/categories/${cat.slug}`} prefetch={false} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', fontSize: '13px', color: '#333',
            textDecoration: 'none', borderBottom: idx < visibleCategories.length - 1 ? '1px solid #f5f5f5' : 'none',
            transition: 'background 0.1s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className={`${getCategoryIcon(cat)} fa-fw`} style={{ color: '#0052D9' }} />
              {cat.name}
            </span>
            <span style={{ fontSize: '12px', color: '#bbb' }}>{cat.count || 0}</span>
          </Link>
        ))}
      </div>
        );
      })()}

      {/* Archive — current year expanded, other years collapsed */}
      <div style={{ borderBottom: '1px solid #e5e5e5' }}>
        {sectionTitle('fa-solid fa-calendar-days', '文章归档')}
        {(() => {
          const hm: any[] = stats.heatmap || [];
          const monthMap: Record<string, number> = {};
          hm.forEach((d: any) => {
            if (!d.date) return;
            const ym = d.date.substring(0, 7);
            monthMap[ym] = (monthMap[ym] || 0) + (d.count || 0);
          });
          const yearMap: Record<string, { month: string; count: number }[]> = {};
          Object.entries(monthMap).sort((a, b) => b[0].localeCompare(a[0])).forEach(([ym, count]) => {
            const [y, m] = ym.split('-');
            if (!yearMap[y]) yearMap[y] = [];
            yearMap[y].push({ month: m, count });
          });
          const currentYear = String(new Date().getFullYear());
          const years = Object.keys(yearMap).sort((a, b) => b.localeCompare(a));

          return years.map((year, yi) => {
            const isCurrentYear = year === currentYear;
            const isOpen = isCurrentYear || archiveOpen === year;
            const yearTotal = yearMap[year].reduce((s, m) => s + m.count, 0);
            const isLastYear = yi === years.length - 1;
            return (
              <div key={year}>
                <button onClick={() => setArchiveOpen(isOpen && !isCurrentYear ? null : year)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                  background: 'none', border: 'none', borderBottom: (isLastYear && !isOpen) ? 'none' : '1px solid #f5f5f5',
                  cursor: 'pointer', color: '#333',
                }}>
                  <span>
                    {!isCurrentYear && <i className={`fa-solid fa-chevron-${isOpen ? 'down' : 'right'} fa-fw`} style={{ fontSize: '10px', color: '#bbb', marginRight: '4px' }} />}
                    {year} 年
                  </span>
                  <span style={{ fontSize: '12px', color: '#bbb' }}>{yearTotal} 篇</span>
                </button>
                {isOpen && yearMap[year].map((m, mi) => (
                  <Link key={m.month} href={`/date/${year}/${m.month}`} prefetch={false} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 16px 6px 32px', fontSize: '12px', color: '#666',
                    textDecoration: 'none', borderBottom: (isLastYear && mi === yearMap[year].length - 1) ? 'none' : '1px solid #f8f8f8',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{parseInt(m.month)} 月</span>
                    <span style={{ color: '#bbb' }}>{m.count}</span>
                  </Link>
                ))}
              </div>
            );
          });
        })()}
      </div>

      {/* Stats */}
      <div>
        {sectionTitle('fa-solid fa-chart-simple', '统计信息')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '0' }}>
          {[
            { label: '文章', value: stats.post_count || 0 },
            { label: '评论', value: stats.comment_count || 0 },
            { label: '建站天数', value: stats.days || 0 },
            { label: '全部字数', value: stats.word_count || 0 },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: '12px 16px', height: '60px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none',
              borderRight: i % 2 === 0 ? '1px solid #f0f0f0' : 'none',
            }}>
              <div style={{ fontSize: '11px', color: '#999', lineHeight: 1 }}>{s.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
