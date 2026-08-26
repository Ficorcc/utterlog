import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useNavigate } from '@/lib/router';
import {
  FileText, MessageSquare, SquarePen, FolderOpen, Settings as SettingsIcon,
  ArrowRight, Plus, Eye, TrendingUp, FolderTree, Tags, Type, CalendarDays,
  BarChart3, Zap, type LucideIcon,
} from 'lucide-react';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return <>{display.toLocaleString()}</>;
}
import api, { networkApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { postUrlOf } from '@/lib/site';
import { Button } from '@/components/ui/shadcn';
import { usePageLoading } from '@/layouts/DashboardLayout';

interface Stats { posts: number; comments: number; links: number; views: number; today: number; words: number; days: number; categories: number; tags: number }
interface Todo { pending_comments: number; drafts: number; link_requests: number }
interface RecentPost { id: number; display_id?: number; title: string; slug: string; status: string; created_at: string; published_at?: string | null; view_count?: number; comment_count?: number; categories?: { id: number; name: string; slug: string; icon?: string }[] }
interface NetworkActivity { type: string; site: string; site_name: string; title: string; content_type: string; created_at: string }
interface NetworkSite { name: string; url: string; logo: string; description: string }

// Category icon is user data (FA class); render it, else a Lucide fallback.
function CatIcon({ icon, className }: { icon?: string; className?: string }) {
  if (icon) return <i className={`${icon} text-xs-plus`} />;
  return <FileText className={className ?? 'size-3'} />;
}

export default function DashboardPage() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { setPageLoading } = usePageLoading();
  const [stats, setStats] = useState<Stats>({ posts: 0, comments: 0, links: 0, views: 0, today: 0, words: 0, days: 0, categories: 0, tags: 0 });
  const [todo, setTodo] = useState<Todo>({ pending_comments: 0, drafts: 0, link_requests: 0 });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载态上报给 header 的统一 spinner；离开本页时清掉。
  useEffect(() => {
    setPageLoading(loading);
    return () => setPageLoading(false);
  }, [loading, setPageLoading]);
  const [sparkline, setSparkline] = useState<{ date: string; visits: number; visitors: number; weekday: string }[]>([]);
  const [networkConnected, setNetworkConnected] = useState(false);
  const [networkActivity, setNetworkActivity] = useState<NetworkActivity[]>([]);
  const [networkSites, setNetworkSites] = useState<NetworkSite[]>([]);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const bootstrapRes: any = await api.get('/admin/bootstrap');
      const bootstrap = bootstrapRes.data || bootstrapRes;
      const d = bootstrap.stats || bootstrap;
      setStats({
        posts: d.posts || 0, comments: d.comments || 0, links: d.links || 0,
        views: d.total_views || 0, today: d.today_visits || 0,
        words: d.total_words || 0, days: d.days || 0,
        categories: d.categories || 0, tags: d.tags || 0,
      });
      setTodo({
        pending_comments: d.todo?.pending_comments || 0,
        drafts: d.todo?.drafts || 0,
        link_requests: d.todo?.link_requests || 0,
      });
      const trendMap: Record<string, { visits: number; visitors: number }> = {};
      for (const tr of (d.trend || [])) {
        trendMap[tr.date] = { visits: tr.visits ?? tr.count ?? 0, visitors: tr.visitors ?? 0 };
      }
      const days30: { date: string; visits: number; visitors: number; weekday: string }[] = [];
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      for (let i = 29; i >= 0; i--) {
        const day = new Date(); day.setDate(day.getDate() - i);
        const key = `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        const v = trendMap[key] ?? { visits: 0, visitors: 0 };
        days30.push({ date: key, visits: v.visits, visitors: v.visitors, weekday: t(`admin.dashboard.weekday.${weekdays[day.getDay()]}`, weekdays[day.getDay()]) });
      }
      setSparkline(days30);
      setRecentPosts((bootstrap.recent_posts || []).filter((p: any) => p.id != null).slice(0, 5));
      setRecentComments((bootstrap.recent_comments || []).filter((c: any) => c.id != null).slice(0, 5));
    } catch { /* interceptor handles expired sessions */ } finally { setLoading(false); }

    try {
      const nr: any = await networkApi.status();
      const nd = nr.data || nr;
      setNetworkConnected(nd.connected || false);
      if (nd.connected) {
        const [feedRes, sitesRes]: any = await Promise.all([
          networkApi.feed({ per_page: 5 }).catch(() => ({ data: { items: [] } })),
          networkApi.sites({ page: 1 }).catch(() => ({ data: { sites: [] } })),
        ]);
        setNetworkActivity((feedRes.data?.items || feedRes.items || []).slice(0, 5));
        setNetworkSites((sitesRes.data?.sites || sitesRes.sites || []).slice(0, 4));
      }
    } catch {}
  };

  const openPostPage = (post: any) => window.open(postUrlOf(post), '_blank', 'noopener,noreferrer');
  const openCommentPostPage = (comment: any) => openPostPage({
    id: comment.post_id, display_id: comment.post_display_id, slug: comment.post_slug,
    created_at: comment.post_created_at, published_at: comment.post_published_at,
    categories: comment.post_categories || [],
  });

  // 主指标只留每天会看的四项；分类 / 标签 / 字数 / 天数信息密度低，放第二行。
  // 图标统一走主色、只做小尺寸线性图标——不再是彩色方块底，但也不至于全无标识。
  const statCards = [
    { title: t('admin.dashboard.stats.posts', '文章'), value: stats.posts, Icon: FileText },
    { title: t('admin.dashboard.stats.comments', '评论'), value: stats.comments, Icon: MessageSquare },
    { title: t('admin.dashboard.stats.views', '浏览量'), value: stats.views, Icon: Eye },
    { title: t('admin.dashboard.stats.today', '今日访问'), value: stats.today, Icon: TrendingUp },
  ];

  const secondaryStats = [
    { label: t('admin.dashboard.stats.categories', '分类'), value: stats.categories, Icon: FolderTree, href: '/posts/categories' },
    { label: t('admin.dashboard.stats.tags', '标签'), value: stats.tags, Icon: Tags, href: '/posts/tags' },
    { label: t('admin.dashboard.stats.words', '总字数'), value: new Intl.NumberFormat(locale || 'zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(stats.words), Icon: Type },
    { label: t('admin.dashboard.stats.days', '建站天数'), value: stats.days, Icon: CalendarDays },
  ];

  // 待办：只显示有数的项；全为 0 时整行不渲染。
  const todoItems = [
    { count: todo.pending_comments, label: t('admin.dashboard.todo.pendingComments', '条评论待审核'), href: '/comments/pending' },
    { count: todo.drafts, label: t('admin.dashboard.todo.drafts', '篇草稿未发布'), href: '/posts?status=draft' },
    { count: todo.link_requests, label: t('admin.dashboard.todo.linkRequests', '条友链申请待处理'), href: '/links?status=0' },
  ].filter((item) => item.count > 0);

  const quickActions = [
    { label: t('admin.dashboard.quick.writePost', '写文章'), Icon: SquarePen, href: '/posts/create' },
    { label: t('admin.dashboard.quick.categories', '管分类'), Icon: FolderOpen, href: '/posts/categories' },
    { label: t('admin.dashboard.quick.comments', '看评论'), Icon: MessageSquare, href: '/comments' },
    { label: t('admin.nav.settings', '设置'), Icon: SettingsIcon, href: '/settings' },
  ];

  // 状态改成纯文字：列表里绝大多数是「已发布」，彩色底块只是噪音。
  // 只有需要动作的状态（草稿 / 待审）才用主色点出来。
  const statusMap: Record<string, { text: string; cls: string }> = {
    publish: { text: t('admin.status.published', '已发布'), cls: 'text-muted-foreground' },
    draft: { text: t('admin.status.draft', '草稿'), cls: 'text-primary' },
    pending: { text: t('admin.status.pending', '待审'), cls: 'text-primary' },
  };

  // 区块标题：小号主色线性图标 + 深色标题。图标统一 14px、只用主色，
  // 不再是每个区块一种颜色。
  const SectionTitle = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
    <h2 className="flex items-center gap-2 text-xs-plus font-semibold text-foreground">
      <Icon className="size-3.5 shrink-0 text-primary" />
      {children}
    </h2>
  );

  const maxS = Math.max(...sparkline.map(s => s.visits), 1);

  const dateLabels = (() => {
    const result: Array<{ month: string; day: string; showMonth: boolean } | null> = [];
    let lastMonth = '';
    for (let i = 0; i < sparkline.length; i++) {
      const isLabeled = i === 0 || i === sparkline.length - 1 || i % 5 === 4;
      if (!isLabeled) { result.push(null); continue; }
      const [month, day] = sparkline[i].date.split('-');
      const showMonth = month !== lastMonth;
      lastMonth = month;
      result.push({ month, day, showMonth });
    }
    return result;
  })();

  const ViewAll = ({ to, label }: { to: string; label: string }) => (
    <button type="button" onClick={() => navigate(to)} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      {label} <ArrowRight className="size-3.5" />
    </button>
  );

  return (
    <div className="flex flex-col gap-7">
      {/* 待办 —— 只在真有事情要处理时出现。用主色点一下，不铺底色。 */}
      {!loading && todoItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-l-2 border-primary bg-muted/40 py-2.5 pl-4 pr-5">
          <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {t('admin.dashboard.todo.title', '待处理')}
          </span>
          {todoItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.href)}
              className="inline-flex items-baseline gap-1.5 bg-transparent text-xs text-muted-foreground hover:text-primary"
            >
              <span className="text-sm font-semibold text-foreground">{item.count}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 指标区：主指标一行大数字，次要指标同容器第二行。整块只有一圈边框、
          内部靠分隔线切分——比 8 张各带边框和阴影的卡片安静得多。 */}
      <div className="border border-border bg-card">
        <div className="grid grid-cols-4 divide-x divide-border">
          {statCards.map((c) => (
            <div key={c.title} className="px-5 py-4">
              <div className="flex items-center gap-1.5">
                <c.Icon className="size-3.5 shrink-0 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">{c.title}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums leading-none text-foreground">
                {loading ? '—' : typeof c.value === 'number' ? <AnimatedNumber value={c.value} /> : c.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
          {secondaryStats.map((s) => {
            const body = (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.Icon className="size-3.5 shrink-0" />
                  {s.label}
                </span>
                <span className="text-xs font-semibold tabular-nums text-foreground">{loading ? '—' : s.value}</span>
              </>
            );
            return s.href ? (
              <button
                key={s.label}
                type="button"
                onClick={() => navigate(s.href!)}
                className="flex items-baseline justify-between gap-2 bg-transparent px-5 py-2.5 transition-colors hover:bg-muted/40"
              >
                {body}
              </button>
            ) : (
              <span key={s.label} className="flex items-baseline justify-between gap-2 px-5 py-2.5">{body}</span>
            );
          })}
        </div>
      </div>

      {/* Trend + Quick actions */}
      <div className="grid grid-cols-[2fr_1fr] items-stretch gap-4">
        {/* Trend chart */}
        <div className="flex flex-col border border-border bg-card p-5 pb-2.5">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle icon={BarChart3}>{t('admin.dashboard.trendTitle', '近 30 天访问趋势')}</SectionTitle>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 bg-primary" />{t('admin.dashboard.visitors', '访客')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 bg-primary/25" />{t('admin.dashboard.visits', '访问')}
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex min-h-24 flex-1 items-end gap-1">
              {sparkline.map((s, i) => {
                const totalH = Math.max(Math.round((s.visits / maxS) * 100), s.visits > 0 ? 4 : 2);
                const visitorRatio = s.visits > 0 ? s.visitors / s.visits : 0;
                const visitorH = Math.max(0, Math.min(100, Math.round(visitorRatio * 100)));
                return (
                  <div key={i} title={t('admin.dashboard.trendTooltip', '{date}  访问 {visits} · 访客 {visitors}', { date: s.date, visits: s.visits, visitors: s.visitors })}
                    className="flex flex-1 cursor-pointer flex-col-reverse" style={{ height: `${totalH}%`, maxHeight: '100%' }}>
                    <div className="bg-primary" style={{ height: `${visitorH}%` }} />
                    <div className="bg-primary/25" style={{ height: `${100 - visitorH}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex gap-1 text-3xs leading-[1.1] text-muted-foreground">
              {dateLabels.map((info, i) => (
                <span key={i} className="flex flex-1 flex-col items-center justify-end text-center">
                  {info?.showMonth ? <span className="text-3xs font-bold leading-[1.1]">{info.month}</span> : null}
                  {info ? <span className="leading-[1.1]">{info.day}</span> : null}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions —— 从 4 个大图标块改成一列可点的行，靠分隔线区分 */}
        <div className="flex flex-col border border-border bg-card">
          <div className="px-5 py-4">
            <SectionTitle icon={Zap}>{t('admin.dashboard.quickActions', '快捷操作')}</SectionTitle>
          </div>
          <div className="flex flex-1 flex-col divide-y divide-border border-t border-border">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => navigate(a.href)}
                className="group flex flex-1 items-center gap-3 bg-transparent px-5 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <a.Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                <span className="text-xs-plus text-foreground">{a.label}</span>
                <ArrowRight className="ml-auto size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent content */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent posts */}
        <div className="overflow-hidden border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <SectionTitle icon={SquarePen}>{t('admin.dashboard.recentPosts', '最近文章')}</SectionTitle>
            <ViewAll to="/posts" label={t('admin.dashboard.viewAll', '全部')} />
          </div>
          {/* 加载态统一由 header 的 spinner 表示（见 usePageLoading） */}
          {loading ? null : recentPosts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="mb-4 text-sm text-muted-foreground">{t('admin.dashboard.noPosts', '暂无文章')}</p>
              <Button onClick={() => navigate('/posts/create')}>
                <Plus className="size-4" />{t('admin.dashboard.writeFirstPost', '写第一篇')}
              </Button>
            </div>
          ) : (
            recentPosts.map((post, idx) => {
              const st = statusMap[post.status] || statusMap.draft;
              return (
                <div key={post.id} onClick={() => openPostPage(post)}
                  className={`flex min-h-18 cursor-pointer items-center px-5 py-3.5 transition-colors hover:bg-muted/50 ${idx < recentPosts.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {post.categories?.[0]?.icon && <CatIcon icon={post.categories[0].icon} className="size-3 shrink-0 text-muted-foreground" />}
                        <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(post.published_at || post.created_at, t)}
                        {post.view_count != null && ` · ${t('post.views', '{count} 阅读', { count: post.view_count })}`}
                        {post.comment_count != null && ` · ${t('post.commentCount', '{count} 评论', { count: post.comment_count })}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs ${st.cls}`}>{st.text}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent comments */}
        <div className="overflow-hidden border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <SectionTitle icon={MessageSquare}>{t('admin.dashboard.recentComments', '最新评论')}</SectionTitle>
            <ViewAll to="/comments" label={t('admin.dashboard.viewAll', '全部')} />
          </div>
          {loading ? null : recentComments.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">{t('admin.dashboard.noComments', '暂无评论')}</div>
          ) : (
            recentComments.map((comment, idx) => (
              <div key={comment.id} className={`flex min-h-18 items-center px-5 py-3.5 ${idx < recentComments.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="flex w-full items-center gap-2.5">
                  {comment.avatar_url ? (
                    <img src={comment.avatar_url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">{(comment.author || '?')[0]}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center">
                      <span className="shrink-0 text-xs-plus font-medium text-muted-foreground">{comment.author}</span>
                      {comment.post_title && (
                        <button type="button" onClick={e => { e.stopPropagation(); openCommentPostPage(comment); }}
                          className="inline-flex min-w-0 items-center gap-1 overflow-hidden px-1.5 text-xs text-muted-foreground">
                          <CatIcon icon={comment.post_categories?.[0]?.icon} className="size-3 shrink-0" />
                          <span className="truncate">{comment.post_title}</span>
                        </button>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatRelativeTime(comment.created_at, t)}</span>
                    </div>
                    <p className="truncate text-xs-plus leading-normal text-foreground">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 未连接社区时只留一条窄提示——原来的整块空态 + CTA 在概览页上太占版面 */}
      {!networkConnected ? (
        <button
          type="button"
          onClick={() => navigate('/utterlog')}
          className="flex w-full items-center gap-3 border border-border bg-card px-5 py-3 text-left transition-colors hover:border-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path d="M12 0c9.601 0 12 2.399 12 12 0 9.601-2.399 12-12 12-9.601 0-12-2.399-12-12C0 2.399 2.399 0 12 0z" fill="var(--primary)" />
            <path d="M17.008 17.29H11.44a5.57 5.57 0 0 1-5.562-5.567A5.57 5.57 0 0 1 11.44 6.16a5.57 5.57 0 0 1 5.567 5.563Z" fill="white" />
          </svg>
          <span className="text-xs-plus font-medium text-foreground">{t('admin.dashboard.joinNetwork', '加入 Utterlog 去中心化网络')}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t('admin.dashboard.networkDescription', '连接到 Utterlog 社区，与其他独立博客互相订阅、共享内容、交流互动')}
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
            {t('admin.common.connect', '连接')} <ArrowRight className="size-3.5" />
          </span>
        </button>
      ) : (
      <div className="overflow-hidden border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path d="M12 0c9.601 0 12 2.399 12 12 0 9.601-2.399 12-12 12-9.601 0-12-2.399-12-12C0 2.399 2.399 0 12 0z" fill="var(--primary)" />
              <path d="M17.008 17.29H11.44a5.57 5.57 0 0 1-5.562-5.567A5.57 5.57 0 0 1 11.44 6.16a5.57 5.57 0 0 1 5.567 5.563Z" fill="white" />
            </svg>
            <h2 className="text-sm-plus font-semibold text-foreground">{t('admin.dashboard.community', 'Utterlog 社区')}</h2>
            {/* 直角，跟「已发布」那类状态徽章一致；rounded-full 只留给头像、
                开关和数字计数气泡。 */}
            <span className={`px-2 py-0.5 text-2xs font-semibold ${networkConnected ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              {networkConnected ? t('admin.common.connected', '已连接') : t('admin.common.disconnected', '未连接')}
            </span>
          </div>
          <ViewAll to="/utterlog" label={networkConnected ? t('admin.common.manage', '管理') : t('admin.common.connect', '连接')} />
        </div>

        {/* 不再撑最小高度：两栏都空时（刚连上、还没有动态）原来会留出
            200px 空白，看起来像加载失败。 */}
        {(
          <div className="grid grid-cols-2">
            <div className="border-r border-border">
              <div className="border-b border-border px-5 py-3">
                <span className="text-xs font-semibold text-muted-foreground">{t('admin.dashboard.networkActivity', '网络动态')}</span>
              </div>
              {networkActivity.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs-plus text-muted-foreground">{t('admin.dashboard.noNetworkActivity', '暂无社区动态')}</div>
              ) : (
                networkActivity.map((item, idx) => (
                  <div key={idx} className={`px-5 py-2.5 ${idx < networkActivity.length - 1 ? 'border-b border-border' : ''}`}>
                    <p className="truncate text-xs-plus text-foreground">
                      <span className="font-semibold">{item.site_name}</span>
                      {' '}{t('admin.dashboard.publishedContent', '发布了{type}', { type: item.content_type === 'moment' ? t('admin.nav.moments', '说说') : t('admin.nav.posts', '文章') })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.title}</p>
                  </div>
                ))
              )}
            </div>
            <div>
              <div className="border-b border-border px-5 py-3">
                <span className="text-xs font-semibold text-muted-foreground">{t('admin.dashboard.newSites', '新加入站点')}</span>
              </div>
              {networkSites.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs-plus text-muted-foreground">{t('admin.dashboard.noNewSites', '暂无新站点')}</div>
              ) : (
                networkSites.map((site, idx) => (
                  <div key={idx} className={`flex items-center gap-2.5 px-5 py-2.5 ${idx < networkSites.length - 1 ? 'border-b border-border' : ''}`}>
                    {site.logo ? (
                      <img src={site.logo} alt="" className="size-7 rounded object-cover" />
                    ) : (
                      <div className="flex size-7 items-center justify-center rounded bg-muted text-xs font-bold text-primary">{(site.name || '?')[0]}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs-plus font-medium text-foreground">{site.name}</p>
                      <p className="truncate text-2xs text-muted-foreground">{site.url}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
