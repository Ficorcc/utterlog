'use client';

/**
 * ShanYing · 首页
 *
 * 两块结构，和原主题 index.php 一致：
 *   1. 个人档案 Hero —— 山景底图 + 问候语 + 大标题 + 最新说说 + 可展开的照片堆，
 *      下半部分是 90 天发布热力图与「最近来聊天的朋友」。
 *   2. 文章分类台（feng-article-hub）—— 分类形图块标签条 + 最新/热评/浏览最多
 *      三个子标签 + 左侧文章行 + 右侧大封面预览 + 标签云。
 *
 * 另有一颗博主入口（HomeAuthDock），挂在全站页脚右下角。
 *
 * 降级说明（Utterlog 没有对应数据的地方，一律显式降级，不留假交互）：
 *   - 原主题 Hero 有「最近分享的音乐」按钮（来自后台曲库），Utterlog 的曲库在
 *     /music 页面，首页拿不到 → 不渲染，而不是放个点了没反应的按钮。
 *   - 分类、排序和分页统一通过公开文章接口查询，覆盖所选分类的全部已发布文章。
 *   - 首屏复用服务端文章数据，点击分类后只更新下方文章面板。
 */

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { datePartsInTimeZone, formatDateInTimeZone, resolveSiteTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import PostCard, { PostCardTile } from './PostCard';
import HeroWeather from './HeroWeather';
import {
  excerptOf,
  greetingOf,
  hourInTimeZone,
  Icon,
  plainText,
  relativeTime,
  ShanYingRecentHeatmap,
  useReveal,
} from './shanying-shared';
import { currentSeason, resolveScene, sceneImageUrl, sceneImageSmallUrl, seasonImageUrl } from './shanying-scene';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { heroSocialLinks } from '@shared/hero-social-links';
import { discoverLinks, type DiscoverLink } from '@shared/discover-links';

type SortKey = 'latest' | 'comments' | 'views';
type ViewKey = 'list' | 'grid';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'latest', label: '最新文章' },
  { key: 'comments', label: '热评文章' },
  { key: 'views', label: '浏览最多' },
];

type SiteLink = DiscoverLink;

/** 图标三态：内联 SVG / 图片地址 / FontAwesome class。 */
function renderSiteIcon(icon: string) {
  if (!icon) return null;
  if (icon.trim().startsWith('<svg')) {
    return <span className="sy-tool-icon" dangerouslySetInnerHTML={{ __html: icon }} />;
  }
  if (icon.startsWith('http') || icon.startsWith('/')) {
    return <img src={icon} alt="" className="sy-tool-icon sy-tool-icon-img" loading="lazy" decoding="async" />;
  }
  return <i className={`${icon} sy-tool-icon`} aria-hidden="true" />;
}

function HeroAvatar({ front }: { front: string }) {
  return (
    <div className="sy-photo-stack" role="img" aria-label="站长头像">
      <span className="sy-stack-front">
        {front
          ? <img src={front} alt="" loading="eager" fetchPriority="high" />
          : <i className="fa-regular fa-mountain" aria-hidden="true" />}
      </span>
    </div>
  );
}

export default function HomePage({
  posts = [],
  page = 1,
  totalPages = 1,
  categories: serverCategories = [],
  archiveStats: serverStats = {},
  latestMoment = null,
  latestComments = [],
  perPage = 10,
}: {
  posts?: any[];
  page?: number;
  totalPages?: number;
  categories?: any[];
  archiveStats?: any;
  latestMoment?: any;
  latestComments?: any[];
  perPage?: number;
}) {
  const ctx = useThemeContext();
  const categories = serverCategories.length ? serverCategories : ctx.categories;
  const stats = serverStats?.post_count ? serverStats : (ctx.archiveStats || {});
  const { ref: hubRef, pending: hubPending } = useReveal<HTMLElement>('0px');

  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('latest');
  const [view, setView] = useState<ViewKey>('list');
  const [focused, setFocused] = useState<number | null>(null);
  const [hubPage, setHubPage] = useState(page);
  const [interactive, setInteractive] = useState(false);

  // A router navigation to another home page restores that page's SSR state.
  useEffect(() => {
    setActiveCategory('all');
    setSort('latest');
    setHubPage(page);
    setInteractive(false);
    setFocused(null);
  }, [page]);

  const selectCategory = (category: number | 'all') => {
    setActiveCategory(category);
    setHubPage(1);
    setFocused(null);
    setInteractive(true);
  };
  const selectSort = (next: SortKey) => {
    setSort(next);
    setHubPage(1);
    setFocused(null);
    setInteractive(true);
  };
  const selectPage = (next: number) => {
    setHubPage(next);
    setFocused(null);
    setInteractive(true);
  };

  const articleQuery = useQuery({
    queryKey: ['shanying-home-posts', activeCategory, sort, hubPage, perPage],
    enabled: interactive,
    staleTime: 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        type: 'post', status: 'publish', page: String(hubPage), per_page: String(perPage),
        order_by: sort === 'comments' ? 'comment_count' : sort === 'views' ? 'view_count' : 'published_at',
        order: 'desc',
      });
      if (activeCategory !== 'all') params.set('category_id', String(activeCategory));
      const response = await fetch(`/api/v1/posts?${params}`, { signal, credentials: 'omit' });
      if (!response.ok) throw new Error('文章加载失败');
      const payload = await response.json();
      if (!payload.success || !Array.isArray(payload.data) || !Number.isInteger(payload.meta?.total_pages)) {
        throw new Error('文章数据格式错误');
      }
      return { posts: payload.data as any[], totalPages: Math.max(1, payload.meta.total_pages), total: Number(payload.meta.total || 0) };
    },
  });
  const loading = interactive && articleQuery.isFetching;
  const failed = interactive && articleQuery.isError;
  const hubTotalPages = interactive ? (articleQuery.data?.totalPages || 1) : totalPages;
  const ordered = interactive ? (articleQuery.data?.posts || []) : posts;


  const tz = ctx.timeZone || resolveSiteTimeZone(ctx.options);
  const hour = hourInTimeZone(tz);
  const scene = resolveScene(ctx.options?.shanying_scene, hour);
  const season = currentSeason(datePartsInTimeZone(new Date(), tz).month);

  const visibleCategories = useMemo(
    () => categories.filter((category: any) => Number(category.count) > 0),
    [categories],
  );

  const heroPost = useMemo(() => {
    if (focused !== null) {
      const found = ordered.find((post: any) => post.id === focused);
      if (found) return found;
    }
    return ordered[0] || null;
  }, [focused, ordered]);

  const socials = useMemo(() => heroSocialLinks(ctx.options || {}), [ctx.options]);

  const badges = [
    { label: '文章', value: stats?.post_count || posts.length || 0 },
    { label: '评论', value: stats?.comment_count || 0 },
    { label: '字数', value: stats?.word_count || 0 },
    { label: '浏览', value: stats?.total_views || 0 },
  ];

  const siteLinks = useMemo(() => discoverLinks(ctx.options || {}), [ctx.options]);

  const copySiteLink = async (item: SiteLink, event: React.MouseEvent<HTMLElement>) => {
    if (!item.copy) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(item.copy);
      toast.success(`${item.label} 已复制`);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const visitors = (latestComments || []).slice(0, 10);
  const heroCover = heroPost?.cover_url || '';
  const heroExcerpt = heroPost ? plainText(heroPost.excerpt || heroPost.content).slice(0, 220) : '';
  const momentText = latestMoment ? plainText(latestMoment.content).slice(0, 90) : '';


  return (
    <div className="sy-home">
      {/* ── 个人档案 Hero ── */}
      <section className="sy-hero" data-scene={scene} aria-labelledby="sy-hero-title">
        <div className="sy-hero-scene" aria-hidden="true">
          <img src={sceneImageUrl(scene)} srcSet={`${sceneImageSmallUrl(scene)} 1280w, ${sceneImageUrl(scene)} 1774w`} sizes="(min-width: 1048px) 1000px, calc(100vw - 48px)" width={1774} height={887} alt="" loading="eager" fetchPriority="high" decoding="async" />
          <span className="sy-hero-veil" />
        </div>

        <HeroWeather />

        <div className="sy-hero-top">
          <div className="sy-hero-identity">
            <div className="sy-hero-welcome-row">
              <p className="sy-welcome">
                <span aria-hidden="true">◍</span>
                {greetingOf(ctx.site.title || '', hour)}
              </p>
              {socials.length > 0 && (
                <div className="sy-hero-social">
                  {socials.map((item, index) => item.copy ? (
                    <button type="button" key={index} aria-label={item.label} title={item.label} onClick={event => copySiteLink(item, event)}>{renderSiteIcon(item.icon)}</button>
                  ) : (
                    <a key={index} href={item.href || '#'} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label}>
                      {renderSiteIcon(item.icon)}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <h1 id="sy-hero-title">{ctx.site.subtitle || ctx.site.description || ctx.site.title}</h1>

            {latestMoment && (
              <a className="sy-hero-note" href="/moments">
                <small>
                  <i className="fa-regular fa-comment" aria-hidden="true" />
                  {/* 相对时间是「渲染那一刻」算的，SSR 与客户端水合差几秒就可能跨桶
                      （「59 分钟前」→「1 小时前」）。这类文本用 suppressHydrationWarning
                      让 React 跳过比对，避免整棵树被判成水合失败。 */}
                  <span suppressHydrationWarning>最新说说 · {relativeTime(latestMoment.created_at) || '刚发布'}</span>
                </small>
                <span>{momentText}</span>
              </a>
            )}
          </div>

          <div className="sy-hero-visual">
            <HeroAvatar front={ctx.owner.avatar || ctx.site.logo || ''} />
          </div>
        </div>

        <div className="sy-hero-bottom">
          <div className="sy-hero-calendar">
            <div className="sy-hero-heading">
              <strong>
                <i className="fa-solid fa-chart-column" aria-hidden="true" />
                站点动态
              </strong>
              <div className="sy-heatmap-chip">
                <span>少</span>
                {[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}
                <span>多</span>
              </div>
              <div className="sy-hero-badges">
                {badges.map((badge) => (
                  <span key={badge.label}>
                    {badge.label} <b>{Number(badge.value).toLocaleString()}</b>
                  </span>
                ))}
              </div>
            </div>
            <ShanYingRecentHeatmap data={stats?.heatmap || []} days={90} />
          </div>

          <div className="sy-hero-visitors">
            <div className="sy-visitor-col">
              <small>最近来聊天的朋友</small>
              <div className="sy-visitor-row">
                {visitors.length === 0 && <span className="sy-visitor-empty">还没有新的评论</span>}
                {visitors.map((comment: any, index: number) => (
                  <Link
                    key={comment.id || index}
                    prefetch={false}
                    href={`${comment.post_slug ? `/posts/${comment.post_slug}` : '/'}#comment-${comment.id}`}
                    className="sy-visitor"
                    title={`${comment.author || '访客'}：${plainText(comment.content).slice(0, 40)}`}
                  >
                    <img src={comment.author_avatar || comment.avatar_url || ''} alt={comment.author || '访客'} loading="lazy" decoding="async" />
                  </Link>
                ))}
              </div>
            </div>
            <div className="sy-discover-col">
              <small>发现更多博客</small>
              <nav className="sy-discover-links" aria-label="发现更多博客">
                {siteLinks.slice(0, 10).map((item, index) => (
                  item.copy ? (
                    <button
                      key={`${item.label}-${index}`}
                      type="button"
                      className="sy-icon-button sy-tool-link"
                      title={`${item.label}（点击复制）`}
                      aria-label={item.label}
                      onClick={(event) => copySiteLink(item, event)}
                    >
                      {renderSiteIcon(item.icon)}
                    </button>
                  ) : (
                    <a
                      key={`${item.label}-${index}`}
                      className="sy-icon-button sy-tool-link"
                      href={item.href || '#'}
                      title={item.label}
                      aria-label={item.label}
                      target={item.href?.startsWith('http') ? '_blank' : undefined}
                      rel={item.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {renderSiteIcon(item.icon)}
                    </a>
                  )
                ))}
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* ── 文章分类台 ── */}
      <section
        className="sy-hub"
        ref={hubRef}
        data-pending={hubPending ? '1' : undefined}
        aria-label="文章分类与列表"
      >
        <nav className="sy-hub-tabs" aria-label="文章分类">
          <button type="button" data-active={activeCategory === 'all' ? '1' : undefined} aria-pressed={activeCategory === 'all'} onClick={() => selectCategory('all')}>
            <span className="sy-hub-tab-image" aria-hidden="true">
              <img src={seasonImageUrl(season)} alt="" loading="lazy" decoding="async" />
            </span>
            <span className="sy-hub-tab-label">
              <Icon name="grid" />
              全部
            </span>
          </button>
          {visibleCategories.map((category: any) => (
            <button
              key={category.id}
              type="button"
              data-active={activeCategory === category.id ? '1' : undefined}
              aria-pressed={activeCategory === category.id}
              onClick={() => selectCategory(category.id)}
              title={category.description || category.name}
            >
              <span className="sy-hub-tab-image" aria-hidden="true">
                {category.cover_url
                  ? <img src={category.cover_url} alt="" loading="lazy" decoding="async" />
                  : <i className={category.icon && /^fa[a-z-]*\s/.test(category.icon) ? category.icon : 'fa-regular fa-folder'} />}
              </span>
              <span className="sy-hub-tab-label">{category.name}</span>
            </button>
          ))}
        </nav>

        <div className="sy-hub-panel" aria-busy={loading}>
          <header className="sy-hub-head">
            <div className="sy-hub-sorts" role="tablist" aria-label="排序">
              {SORTS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={sort === item.key}
                  data-active={sort === item.key ? '1' : undefined}
                  onClick={() => selectSort(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="sy-hub-head-tools">
              {/* 原主题同时有「文章行」和「宫格」两种陈列，这里做成可切换的视图 */}
              <div className="sy-hub-views" role="group" aria-label="陈列方式">
                <button
                  type="button"
                  data-active={view === 'list' ? '1' : undefined}
                  aria-pressed={view === 'list'}
                  title="列表视图"
                  aria-label="列表视图"
                  onClick={() => setView('list')}
                >
                  <Icon name="list" />
                </button>
                <button
                  type="button"
                  data-active={view === 'grid' ? '1' : undefined}
                  aria-pressed={view === 'grid'}
                  title="宫格视图"
                  aria-label="宫格视图"
                  onClick={() => setView('grid')}
                >
                  <Icon name="grid" />
                </button>
              </div>

              {hubTotalPages > 1 && (
                <nav className="sy-hub-pager" aria-label="分页">
                  <button type="button" disabled={loading || hubPage <= 1} aria-label="上一页" onClick={() => selectPage(hubPage - 1)}><Icon name="previous" /></button>
                  <em>{hubPage} / {hubTotalPages}</em>
                  <button type="button" disabled={loading || hubPage >= hubTotalPages} aria-label="下一页" onClick={() => selectPage(hubPage + 1)}><Icon name="next" /></button>
                </nav>
              )}
            </div>
          </header>

          {loading && <p className="sy-hub-empty" role="status">正在加载文章…</p>}
          {failed && (
            <p className="sy-hub-empty" role="alert">
              文章加载失败，请稍后重试。{' '}
              <button type="button" onClick={() => articleQuery.refetch()}>重试</button>
            </p>
          )}
          {!loading && !failed && ordered.length === 0 && (
            <p className="sy-hub-empty">{activeCategory === 'all' ? '暂无已发布文章。' : '这个分类暂无已发布文章。'}</p>
          )}

          {view === 'list' ? (
            <div className="sy-hub-body">
              <div className="sy-hub-list">
                {ordered.map((post: any, index: number) => (
                  <div
                    key={post.id}
                    className="sy-hub-list-item"
                    data-active={heroPost?.id === post.id ? '1' : undefined}
                    onMouseEnter={() => setFocused(post.id)}
                    onFocus={() => setFocused(post.id)}
                  >
                    <span className="sy-hub-list-index">{String((hubPage - 1) * perPage + index + 1).padStart(2, '0')}</span>
                    <PostLink post={post} className="sy-hub-list-title">{post.title}</PostLink>
                    <span className="sy-hub-list-date">
                      {formatDateInTimeZone(postDateInput(post), 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }, tz).replace(/\//g, '.')}
                    </span>
                  </div>
                ))}
              </div>

              <aside className="sy-hub-preview" aria-hidden="true">
                {heroPost ? (
                  <PostLink post={heroPost} className="sy-hub-preview-inner">
                    {heroCover
                      ? <img src={heroCover} alt="" loading="lazy" decoding="async" />
                      : <span className="sy-hub-preview-blank"><i className="fa-regular fa-image" /></span>}
                    <span className="sy-hub-preview-veil" />
                    <span className="sy-hub-preview-copy">
                      <strong>{heroPost.title}</strong>
                      {heroExcerpt && <em>{heroExcerpt.slice(0, 120)}</em>}
                    </span>
                  </PostLink>
                ) : (
                  <span className="sy-hub-preview-blank"><i className="fa-regular fa-image" /></span>
                )}
              </aside>
            </div>
          ) : (
            <div className="sy-card-grid sy-hub-grid">
              {ordered.map((post: any) => <PostCardTile key={post.id} post={post} />)}
            </div>
          )}

          {sortedTags(ctx.tags).length > 0 && (
            <footer className="sy-hub-tags" aria-label="标签">
              {sortedTags(ctx.tags).slice(0, 14).map((tag: any) => (
                <Link prefetch={false} key={tag.id} href={`/tags/${tag.slug}`}>
                  #{tag.name}
                  <sup>{tag.count || 0}</sup>
                </Link>
              ))}
            </footer>
          )}
        </div>
      </section>

      {/* 分页页不再在底部重复渲染文章列表：分类台本身就是当页列表，
          再叠一层「往期」会把同一批文章输出两遍（原主题分页页是纯列表，
          这里对应的纯列表就是上面的分类台）。 */}
    </div>
  );
}

function sortedTags(tags: any[] | undefined) {
  return [...(tags || [])].sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
}

/** 供分类/标签页复用的封面卡列表。 */
export { PostCard, excerptOf };
