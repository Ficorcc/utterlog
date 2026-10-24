import { useEffect, useState } from 'react';
import { createFileRoute, useMatch, useNavigate } from '@tanstack/react-router';
import PostLink from '@/components/blog/PostLink';
import { StartThemeShell } from '../components/StartThemeShell';
import type { ThemeContextData } from '@/lib/theme-context';

export const Route = createFileRoute('/annual')({
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = Number(search.year);
    const year = Number.isInteger(parsed) && parsed >= 2015 && parsed <= new Date().getFullYear()
      ? parsed
      : new Date().getFullYear();
    return { year };
  },
  component: AnnualPage,
});

interface AnnualTop {
  id: number;
  title: string;
  slug?: string;
  view_count?: number;
  comment_count?: number;
}

interface AnnualData {
  year: number;
  posts: {
    count: number;
    words: number;
    views: number;
    monthly: { month: number; count: number }[];
    top: AnnualTop[];
  };
  comments: { count: number; topCommenters: { name: string; count: number }[] };
  moments: number;
  places: { city: string; country: string; count: number }[];
}

function AnnualPage() {
  const { year } = Route.useSearch();
  const navigate = useNavigate();
  const rootMatch = useMatch({ from: '__root__' });
  const ctx = rootMatch.loaderData as ThemeContextData | null;
  const [data, setData] = useState<AnnualData | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/v1/stats/annual?year=${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (cancelled) return;
        setData(r?.data && r.data.year === year ? (r.data as AnnualData) : null);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [year]);

  const switchYear = (next: number) => {
    if (next < 2015 || next > currentYear) return;
    navigate({ to: '/annual', search: { year: next } });
  };

  if (!ctx) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p>正在加载…</p>
      </main>
    );
  }

  const fmt = (n: number) => n.toLocaleString('zh-CN');
  const maxMonthly = data ? Math.max(...data.posts.monthly.map((m) => m.count), 1) : 1;
  const isEmpty = data && data.posts.count === 0 && data.comments.count === 0 && data.moments === 0 && data.places.length === 0;

  return (
    <StartThemeShell ctx={ctx}>
      <div className="sy-annual">
        <header className="sy-annual-hero">
          <span className="sy-annual-badge">ANNUAL REPORT</span>
          <h1 className="sy-annual-title">
            {ctx.site.title}
            <span className="sy-annual-year">{year}</span>
          </h1>
          <p className="sy-annual-sub">年度报告 · 一年的写作与足迹</p>
          <div className="sy-annual-nav">
            <button type="button" onClick={() => switchYear(year - 1)} disabled={year <= 2015} aria-label="上一年">←</button>
            <span className="sy-annual-nav-year">{year}</span>
            <button type="button" onClick={() => switchYear(year + 1)} disabled={year >= currentYear} aria-label="下一年">→</button>
          </div>
        </header>

        {loading && <p className="sy-annual-state">正在生成报告…</p>}

        {!loading && isEmpty && (
          <div className="sy-annual-state sy-annual-empty">
            <p>{year} 年还没有留下内容，换个年份看看。</p>
          </div>
        )}

        {!loading && data && !isEmpty && (
          <>
            <section className="sy-annual-stats" aria-label="年度数据">
              <div className="sy-annual-stat"><strong>{fmt(data.posts.count)}</strong><span>篇文章</span></div>
              <div className="sy-annual-stat"><strong>{fmt(data.posts.words)}</strong><span>写作字数</span></div>
              <div className="sy-annual-stat"><strong>{fmt(data.posts.views)}</strong><span>累计浏览</span></div>
              <div className="sy-annual-stat"><strong>{fmt(data.comments.count)}</strong><span>收到评论</span></div>
              <div className="sy-annual-stat"><strong>{fmt(data.moments)}</strong><span>条说说</span></div>
              <div className="sy-annual-stat"><strong>{fmt(data.places.length)}</strong><span>处足迹</span></div>
            </section>

            <section className="sy-annual-block" aria-label="发布节奏">
              <h2>发布节奏</h2>
              <div className="sy-annual-chart" role="img" aria-label={`${year} 年每月发布文章数`}>
                {data.posts.monthly.map((m) => (
                  <div key={m.month} className="sy-annual-bar-col">
                    <div className="sy-annual-bar-track">
                      <div
                        className="sy-annual-bar"
                        style={{ height: `${Math.round((m.count / maxMonthly) * 100)}%` }}
                        title={`${m.month} 月：${m.count} 篇`}
                      />
                    </div>
                    <span className="sy-annual-bar-label">{m.month}</span>
                  </div>
                ))}
              </div>
            </section>

            {data.posts.top.length > 0 && (
              <section className="sy-annual-block" aria-label="最受欢迎文章">
                <h2>最受欢迎</h2>
                <div className="sy-annual-top">
                  {data.posts.top.map((post, i) => (
                    <PostLink key={post.id} post={post} className="sy-annual-top-item">
                      <span className="sy-annual-top-rank">{String(i + 1).padStart(2, '0')}</span>
                      <span className="sy-annual-top-title">{post.title}</span>
                      <span className="sy-annual-top-meta">
                        {fmt(Number(post.view_count) || 0)} 浏览 · {fmt(Number(post.comment_count) || 0)} 评论
                      </span>
                    </PostLink>
                  ))}
                </div>
              </section>
            )}

            {data.places.length > 0 && (
              <section className="sy-annual-block" aria-label="年度足迹">
                <h2>去过的城市</h2>
                <div className="sy-annual-places">
                  {data.places.map((p) => (
                    <span key={`${p.city}-${p.country}`} className="sy-annual-place">
                      {p.city}{p.count > 1 ? <em> ×{p.count}</em> : null}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {data.comments.topCommenters.length > 0 && (
              <section className="sy-annual-block" aria-label="最活跃的评论者">
                <h2>最常说话的人</h2>
                <div className="sy-annual-people">
                  {data.comments.topCommenters.map((c) => (
                    <span key={c.name} className="sy-annual-person">
                      {c.name}<em> ×{fmt(c.count)}</em>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <footer className="sy-annual-foot">
              <p>数据来自本站公开内容 · 由 {ctx.site.title || 'Utterlog'} 自动生成</p>
            </footer>
          </>
        )}
      </div>
    </StartThemeShell>
  );
}
