'use client';

import { useEffect, useMemo, useState } from 'react';
import PostLink from '@/components/blog/PostLink';
import { randomCoverUrl } from '@/lib/blog-image';
import { postDateInput } from '@/lib/post-date';
import { useThemeContext } from '@/lib/theme-context';
import { formatDateInTimeZone } from '@/lib/timezone';

interface NavPost {
  id: number;
  title: string;
  slug: string;
  cover_url?: string;
  created_at: number;
  published_at?: string | number | null;
  view_count?: number;
  comment_count?: number;
  categories?: { id: number; name: string; slug: string; icon?: string }[];
}

interface NavigationData {
  prev: NavPost | null;
  next: NavPost | null;
  related: NavPost[];
  random: NavPost[];
  popular: NavPost[];
  category: NavPost[];
}

const API_BASE = '/api/v1';

/** 上下篇与相关文章都用小方图，不抢正文的视觉重心 */
const THUMB_SIZE = 88;
const CARD_THUMB_SIZE = 72;

export default function PostNavigation({ postId, pageSize }: { postId: number; pageSize?: number }) {
  const { options, timeZone } = useThemeContext();
  const [data, setData] = useState<NavigationData | null>(null);
  const [activeTab, setActiveTab] = useState('related');
  const PAGE_SIZE = pageSize ?? 6;

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/posts/${postId}/navigation`)
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        const d = (r.data || r) as NavigationData;
        setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const tabs = useMemo(() => {
    if (!data) return [];
    return [
      { key: 'related', label: '相关文章', items: data.related || [] },
      { key: 'random', label: '随机文章', items: data.random || [] },
      { key: 'popular', label: '热门文章', items: data.popular || [] },
      { key: 'category', label: '分类文章', items: data.category || [] },
    ];
  }, [data]);

  const activeItems = useMemo(() => {
    const tab = tabs.find((t) => t.key === activeTab);
    return (tab?.items || []).slice(0, PAGE_SIZE);
  }, [tabs, activeTab, PAGE_SIZE]);

  if (!data) return null;

  const coverOf = (post: NavPost) => post.cover_url || randomCoverUrl(post.id, options);
  const dateOf = (post: NavPost) =>
    formatDateInTimeZone(postDateInput(post), 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }, timeZone);

  return (
    <nav className="ember-post-nav" aria-label="文章导航">
      <div className="ember-post-nav-list">
        {data.prev ? (
          <PostLink post={data.prev} className="ember-post-nav-item ember-post-nav-item--prev">
            <span className="ember-post-nav-thumb" style={{ width: THUMB_SIZE, height: THUMB_SIZE }}>
              <img src={coverOf(data.prev)} alt={data.prev.title} loading="lazy" decoding="async" />
            </span>
            <span className="ember-post-nav-body">
              <span className="ember-post-nav-label">
                <i className="fa-regular fa-arrow-left" aria-hidden="true" /> 上一篇
              </span>
              <span className="ember-post-nav-title">{data.prev.title}</span>
              <span className="ember-post-nav-date">{dateOf(data.prev)}</span>
            </span>
          </PostLink>
        ) : (
          <div className="ember-post-nav-item ember-post-nav-item--empty">
            <span className="ember-post-nav-thumb" style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
            <span className="ember-post-nav-body">
              <span className="ember-post-nav-label">
                <i className="fa-light fa-sparkles" aria-hidden="true" /> 已是最早一篇
              </span>
            </span>
          </div>
        )}

        {data.next ? (
          <PostLink post={data.next} className="ember-post-nav-item ember-post-nav-item--next">
            <span className="ember-post-nav-body">
              <span className="ember-post-nav-label">
                下一篇 <i className="fa-regular fa-arrow-right" aria-hidden="true" />
              </span>
              <span className="ember-post-nav-title">{data.next.title}</span>
              <span className="ember-post-nav-date">{dateOf(data.next)}</span>
            </span>
            <span className="ember-post-nav-thumb" style={{ width: THUMB_SIZE, height: THUMB_SIZE }}>
              <img src={coverOf(data.next)} alt={data.next.title} loading="lazy" decoding="async" />
            </span>
          </PostLink>
        ) : (
          <div className="ember-post-nav-item ember-post-nav-item--empty ember-post-nav-item--next">
            <span className="ember-post-nav-body">
              <span className="ember-post-nav-label">
                这是最新文章 <i className="fa-light fa-sparkles" aria-hidden="true" />
              </span>
            </span>
            <span className="ember-post-nav-thumb" style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
          </div>
        )}
      </div>

      {tabs.some((tab) => tab.items.length > 0) ? (
        <div className="ember-related">
          <div className="ember-related-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`ember-related-tab${activeTab === tab.key ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                disabled={tab.items.length === 0}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeItems.length > 0 ? (
            <div className="ember-related-grid">
              {activeItems.map((post) => {
                const category = post.categories?.[0];
                return (
                  <PostLink key={post.id} post={post} className="ember-related-card">
                    <span className="ember-related-card-thumb" style={{ width: CARD_THUMB_SIZE, height: CARD_THUMB_SIZE }}>
                      <img src={coverOf(post)} alt={post.title} loading="lazy" decoding="async" />
                    </span>
                    <span className="ember-related-card-body">
                      <span className="ember-related-card-title">{post.title}</span>
                      <span className="ember-related-card-meta">
                        <span>{dateOf(post)}</span>
                        {category ? (
                          <span className="ember-related-card-cat">
                            {category.icon ? <i className={category.icon} aria-hidden="true" /> : null}
                            {category.name}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </PostLink>
                );
              })}
            </div>
          ) : (
            <div className="ember-related-empty">暂无文章</div>
          )}
        </div>
      ) : null}
    </nav>
  );
}
