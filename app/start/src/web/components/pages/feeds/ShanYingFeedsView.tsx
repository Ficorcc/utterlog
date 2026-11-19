'use client';

// ShanYing 主题专用的订阅页视觉。
//
// 复刻对象是 WordPress 主题「山映 · ShanYing」的订阅页
// （pages/subscriptions.php + assets/css/main.css 的 /* feng-feed */ 段）：
//
//   标题行（左：图标 + 订阅 / 右：N 个订阅 · N 篇今日更新 · 同步状态）
//     └ 圆角面板
//         ├ 标签栏：全部动态 / 今日更新
//         ├ 状态行：已收录 N 篇文章
//         ├ 条目列表：36px 圆角头像 + 「站点名 · MM 月 DD 日 HH:MM [今日]」
//         │            + 标题（右侧外链箭头）+ 两行截断摘要，条目之间细分隔线
//         ├ 「再看一些」
//         └ 页脚说明：按原文发布时间排序 · 点击标题前往朋友的博客
//
// 样式全部写在 themes/ShanYing/styles.css 的 `.sy-feeds*` 段，作用域挂在
// html[data-theme='ShanYing'] 上，浅色 / 深色自动跟随主题令牌。
//
// 其他主题继续走 LegacyFeedsView（旋转卡片）或 NebulaFeedsView（grid/list），
// 本文件不影响它们。

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import PageTitle from '@/components/blog/PageTitle';
import { siteFaviconUrl } from '@/lib/site-favicon';
import { useAuthStore } from '@/lib/store';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pub_date?: string;
  pubDate?: string;
  site_name?: string;
  site_url?: string;
  sourceName?: string;
  sourceUrl?: string;
}

interface FeedStats {
  count_total: number;
  count_today: number;
  rss_count: number;
  last_fetched_at: number;
}

type Period = 'all' | 'today';

const sourceColors = [
  '#4a9e8e', '#c4956a', '#8b7ec8', '#d4837a', '#6b9dbd', '#9aab68',
  '#e8a87c', '#7eb5a6', '#b07ec8', '#c97a7a', '#5d8cae', '#85a65d',
];

function getSourceColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return sourceColors[Math.abs(hash) % sourceColors.length];
}

// RSS 里夹带的实体（"Kevin&#039;s"）用浏览器自己的解析器还原
function decodeEntities(s: string): string {
  if (!s || typeof window === 'undefined') return s;
  if (!s.includes('&')) return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

function stripTags(s: string) {
  return decodeEntities((s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

// pub_date 可能是 unix 秒、unix 毫秒或 ISO 字符串，统一成 Date
function toDate(val?: string | number | null): Date | null {
  if (!val) return null;
  const num = Number(val);
  const d = !isNaN(num) && num > 1e9 ? new Date(num * 1000) : new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

// 「09 月 26 日 22:24」
function formatEntryDate(d: Date | null) {
  if (!d) return '';
  return `${pad2(d.getMonth() + 1)} 月 ${pad2(d.getDate())} 日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 接口返回体统一是 { success, data, meta }，取真正的那层。 */
function payloadOf(response: any) {
  return response?.data ?? response;
}

function isSameDay(a: Date | null, b: Date) {
  return !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 「尚未同步」/「上次同步 2026-09-27 11:30」
function formatSync(lastFetchedAt: number) {
  if (!lastFetchedAt) return '尚未同步';
  const d = new Date(lastFetchedAt * 1000);
  if (isNaN(d.getTime())) return '尚未同步';
  return `上次同步 ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function ShanYingFeedsView() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [autoLoadExhausted, setAutoLoadExhausted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshText, setRefreshText] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 强制刷新订阅要走管理员接口（/social/fetch-feeds 是 withAdmin 保护的），
  // 所以只有站长登录后才允许触发；访客点按钮只会得到提示。
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const loadStats = async () => {
    try {
      const r: any = await api.get('/social/feed-stats');
      setStats(payloadOf(r) as FeedStats);
    } catch {
      /* 统计拿不到不影响列表 */
    }
  };

  useEffect(() => {
    // 统计单独取：接口很轻（四个 count），失败也不该拖住列表渲染
    loadStats();
  }, []);

  // 切换「全部动态 / 今日更新」时重新拉第一页 —— 服务端按 period 过滤，
  // 不能只在前端筛已加载的那几条，否则「今日更新」会漏。
  useEffect(() => {
    loadFeeds(1, true, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // 一次性 sentinel 自动加载：滚到底自动补一页，之后改为显式点击
  useEffect(() => {
    if (autoLoadExhausted || !hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setAutoLoadExhausted(true);
          loadFeeds(page + 1, false, period);
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoadExhausted, hasMore, loading, loadingMore, page, period]);

  const loadFeeds = async (targetPage: number, reset: boolean, currentPeriod: Period) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const query = `/social/feed-timeline?page=${targetPage}${currentPeriod === 'today' ? '&period=today' : ''}`;
      const r: any = await api.get(query);
      const data = r.data || [];
      const meta = r.meta || {};
      const mapped: FeedItem[] = data.map((item: any) => ({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pub_date,
        sourceName: item.site_name,
        sourceUrl: item.site_url,
      }));
      setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
      setPage(targetPage);
      setHasMore(meta.has_more ?? Number(meta.page) < Number(meta.total_pages));
    } catch {
      if (reset) setItems([]);
      setHasMore(false);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  const switchPeriod = (next: Period) => {
    if (next === period) return;
    setAutoLoadExhausted(false);
    setItems([]);
    setPeriod(next);
  };

  /**
   * 强制刷新订阅：清掉各订阅源的旧缓存，重新抓一遍所有源的最新文章。
   * 后台的「刷新订阅」按钮走的是同一套接口，这里只是把进度搬到前台页面上。
   */
  const refreshFeeds = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录后再刷新订阅');
      return;
    }
    if (refreshing) return;
    setRefreshing(true);
    setRefreshText('正在启动…');
    try {
      const start: any = await api.post('/social/fetch-feeds', { force: true });
      let d: any = payloadOf(start);
      const startedAt = Date.now();
      // 抓 95 个源要四五分钟（每个源一次外网请求），最多等 10 分钟；
      // 每 1.2 秒拉一次进度。超时也不会中断服务端任务，只是页面不再跟踪。
      while (d?.running && Date.now() - startedAt < 10 * 60 * 1000) {
        await sleep(1200);
        const status: any = await api.get('/social/fetch-feeds/status');
        d = payloadOf(status);
        const done = Number(d?.done || 0);
        const total = Number(d?.total || 0);
        setRefreshText(total ? `刷新中 ${done}/${total}` : '刷新中…');
      }
      if (d?.running) {
        toast.error('刷新仍在进行，请稍后再看');
        return;
      }
      const fetched = Number(d?.fetched || 0);
      const newItems = Number(d?.new_items || 0);
      const failed = Number(d?.failed || 0);
      if (failed > 0) {
        toast.error(`已刷新 ${fetched} 个订阅，失败 ${failed} 个，新增 ${newItems} 条`);
      } else {
        toast.success(`已刷新 ${fetched} 个订阅，新增 ${newItems} 条`);
      }
      // 缓存被清了，列表和统计都要重新拉
      setAutoLoadExhausted(false);
      setItems([]);
      await loadStats();
      await loadFeeds(1, true, period);
    } catch {
      toast.error('刷新失败，请稍后再试');
    } finally {
      setRefreshing(false);
      setRefreshText('');
    }
  };

  const today = new Date();
  const rssCount = stats?.rss_count ?? 0;
  const todayCount = stats?.count_today ?? 0;
  const total = stats?.count_total ?? 0;
  const syncLabel = formatSync(stats?.last_fetched_at ?? 0);

  const renderEntry = (item: FeedItem, i: number) => {
    const name = decodeEntities(item.sourceName || item.site_name || '');
    const siteUrl = item.sourceUrl || item.site_url || '';
    const color = getSourceColor(name);
    const date = toDate(item.pubDate || item.pub_date);
    const favicon = siteUrl ? siteFaviconUrl(siteUrl) : '';
    const initial = name ? name[0].toUpperCase() : '?';
    const desc = stripTags(item.description || '');
    const isToday = isSameDay(date, today);

    return (
      <article className="sy-feed-entry" key={`${i}-${item.link}`}>
        <div className="sy-feed-entry-mark" style={{ color }}>
          <span className="sy-feed-entry-initial" aria-hidden="true">{initial}</span>
          {favicon && (
            <img
              src={favicon}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
        <div className="sy-feed-entry-body">
          <div className="sy-feed-entry-meta">
            <span className="sy-feed-source">{name}</span>
            <span className="sy-feed-sep" aria-hidden="true">·</span>
            <time className="sy-feed-date">{formatEntryDate(date)}</time>
            {isToday && <span className="sy-feed-today">今日</span>}
          </div>
          <h2 className="sy-feed-title">
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              <span>{decodeEntities(item.title)}</span>
              <i className="fa-regular fa-arrow-up-right-from-square" aria-hidden="true" />
            </a>
          </h2>
          {desc && <p className="sy-feed-desc">{desc}</p>}
        </div>
      </article>
    );
  };

  return (
    <div className="sy-feeds">
      <PageTitle
        title="订阅"
        icon="fa-sharp fa-light fa-rss"
        actions={
          <div className="sy-feeds-refresh-wrap">
            <button
              type="button"
              className="sy-feeds-refresh"
              onClick={refreshFeeds}
              disabled={refreshing}
              aria-live="polite"
              aria-label="强制刷新订阅"
              title={isAuthenticated ? '强制刷新订阅：清空缓存并重新抓取全部订阅源' : '需要站长登录后才能刷新订阅'}
            >
              <i className={`fa-solid fa-rotate ${refreshing ? 'sy-feeds-refresh-spin' : ''}`} aria-hidden="true" />
            </button>
            {refreshing && (
              <span className="sy-feeds-refresh-text" role="status">
                {refreshText || '刷新中…'}
              </span>
            )}
            {!isAuthenticated && <span className="sy-feeds-refresh-hint">需登录</span>}
          </div>
        }
        meta={
          <>
            <span className="sy-feeds-stat">
              <i className="fa-solid fa-rss" aria-hidden="true" />
              <strong>{rssCount}</strong> 个订阅
            </span>
            <span className="sy-feeds-stat">
              <strong>{todayCount}</strong> 篇今日更新
            </span>
            <span className="sy-feeds-stat sy-feeds-sync">
              <i className="fa-regular fa-clock" aria-hidden="true" />
              <span>{syncLabel}</span>
            </span>
          </>
        }
      />

      <section className="sy-feeds-panel">
        <div className="sy-feeds-toolbar">
          <div className="sy-feeds-tabs" role="group" aria-label="更新范围">
            <button type="button" aria-pressed={period === 'all'} onClick={() => switchPeriod('all')}>
              全部动态
            </button>
            <button type="button" aria-pressed={period === 'today'} onClick={() => switchPeriod('today')}>
              今日更新
            </button>
          </div>
        </div>

        <p className="sy-feeds-status" role="status">
          {loading ? '加载中…' : total ? `已收录 ${total} 篇文章` : '还没有同步到动态'}
        </p>

        <div className="sy-feeds-entries" aria-busy={loading}>
          {items.map(renderEntry)}

          {!loading && items.length === 0 && (
            <div className="sy-feeds-empty">
              <i className="fa-solid fa-rss" aria-hidden="true" />
              <h2>{period === 'today' ? '今天还没有新动态' : '把朋友的更新，放在这里'}</h2>
              <p>
                {period === 'today'
                  ? '切回「全部动态」看看最近收录的文章。'
                  : '在后台友链管理里给朋友填上 RSS 地址，这里就会出现他们的文章。'}
              </p>
            </div>
          )}
        </div>

        {items.length > 0 && hasMore && (
          <div ref={sentinelRef} className="sy-feeds-more-wrap">
            {loadingMore ? (
              <span className="sy-feeds-loading">加载中…</span>
            ) : (
              <button type="button" className="sy-feeds-more" onClick={() => loadFeeds(page + 1, false, period)}>
                再看一些
                <i className="fa-regular fa-arrow-down" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <footer className="sy-feeds-footer">
          <span>按原文发布时间排序 · 点击标题前往朋友的博客</span>
        </footer>
      </section>
    </div>
  );
}
