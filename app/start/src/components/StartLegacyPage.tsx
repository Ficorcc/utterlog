import { lazy, Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { getThemeComponents } from '@/lib/theme';
import PageTitle from '@/components/blog/PageTitle';
import PostLink from '@/components/blog/PostLink';
import {
  DefaultArchivePage,
  DefaultCategoriesPage,
  DefaultCategoryPage,
  DefaultNotFoundPage,
  DefaultTagPage,
  DefaultTagsPage,
} from '@/components/blog/defaults';
import { datePartsInTimeZone, formatMonthDayInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import type { StartLegacyRouteData } from '../server/legacy';
import { StartThemeShell } from './StartThemeShell';

const FootprintsClient = lazy(() => import('@/app/(blog)/footprints/FootprintsClient'));
const MomentsClient = lazy(() => import('@/app/(blog)/moments/MomentsClient'));
const LinksClient = lazy(() => import('@/app/(blog)/links/LinksClient'));
const FeedsClient = lazy(() => import('@/app/(blog)/feeds/FeedsClient'));
const AlbumsClient = lazy(() => import('@/app/(blog)/albums/AlbumsClient'));
const MusicClient = lazy(() => import('@/app/(blog)/music/MusicClient'));
const AboutContent = lazy(() => import('@/app/(blog)/about/AboutContent'));

const shelfMeta = {
  movies: { title: '电影', subtitle: '我看过的', icon: 'fa-sharp fa-light fa-film', unit: '部电影', imageRatio: '2/3' },
  books: { title: '图书', subtitle: '我读过的', icon: 'fa-sharp fa-light fa-book', unit: '本图书', imageRatio: '2/3' },
  games: { title: '游戏', subtitle: '我玩过的', icon: 'fa-sharp fa-light fa-gamepad', unit: '款游戏', imageRatio: '5/4' },
  goods: { title: '好物', subtitle: '我用过的', icon: 'fa-sharp fa-light fa-bag-shopping', unit: '件好物', imageRatio: '4/3' },
} as const;

const filmTabs = [
  { key: '', label: '全部' },
  { key: 'tv', label: '剧集' },
  { key: 'movie', label: '电影' },
  { key: 'show', label: '综艺' },
  { key: 'anime', label: '动漫' },
  { key: 'doc', label: '纪录片' },
];

function Shell({ data, children }: { data: StartLegacyRouteData; children: React.ReactNode }) {
  const content = <Suspense fallback={<div style={{ minHeight: '60vh' }} aria-hidden="true" />}>{children}</Suspense>;
  if ('ctx' in data && data.ctx) return <StartThemeShell ctx={data.ctx}>{content}</StartThemeShell>;
  return <main className="start-shell">{content}</main>;
}

function formatSearchDate(post: any, timeZone: string) {
  const { year, month, day } = datePartsInTimeZone(postDateInput(post), timeZone);
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

function MediaGrid({ data }: { data: Extract<StartLegacyRouteData, { kind: 'shelf' }> }) {
  const meta = shelfMeta[data.shelf];
  return (
    <div style={{ minHeight: 'calc(100vh - 200px)' }}>
      <PageTitle
        title={meta.title}
        icon={meta.icon}
        subtitle={meta.subtitle}
        meta={<><strong>{data.items.length}</strong> {meta.unit}</>}
      />
      <div style={{ padding: '32px' }}>
        {data.items.length === 0 ? (
          <p className="text-dim" style={{ textAlign: 'center', padding: '80px 0' }}>暂无内容</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {data.items.map((item: any) => (
              <div key={item.id || item.title} style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', overflow: 'hidden' }}>
                <div style={{ width: '100%', aspectRatio: meta.imageRatio, background: 'var(--color-bg-soft)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className={meta.icon} style={{ fontSize: 36, color: 'var(--color-text-dim)' }} />
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <h3 className="text-main" style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
                  <p className="text-sub" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.author_name || item.director || item.platform || item.brand || item.year || ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchPage({ data }: { data: Extract<StartLegacyRouteData, { kind: 'search' }> }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 200px)' }}>
      <PageTitle title="搜索" icon="fa-sharp fa-light fa-magnifying-glass" />
      <div style={{ padding: '0 32px 32px' }}>
        <form action="/search" method="GET" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              name="q"
              defaultValue={data.query}
              placeholder="搜索文章、关键词或标题"
              style={{ flex: 1, padding: '10px 16px', fontSize: 15, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text-main)', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '10px 24px', fontSize: 14, fontWeight: 500, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>搜索</button>
          </div>
        </form>
        {data.query ? (
          <div>
            <p style={{ fontSize: 14, color: 'var(--color-text-sub)', marginBottom: 16 }}>
              搜索 <strong style={{ color: 'var(--color-text-main)' }}>&ldquo;{data.query}&rdquo;</strong> 共找到 <strong>{data.total}</strong> 篇文章
            </p>
            {data.results.length ? data.results.map((post: any) => (
              <PostLink key={post.id} post={post} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1px solid var(--color-border)', textDecoration: 'none' }}>
                {post.cover_url ? <img src={post.cover_url} alt="" loading="lazy" style={{ width: 80, height: 56, objectFit: 'cover', flexShrink: 0 }} /> : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 4 }}>{post.title}</h3>
                  {post.excerpt ? <p style={{ fontSize: 13, color: 'var(--color-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.excerpt}</p> : null}
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{formatSearchDate(post, data.timeZone)}</span>
              </PostLink>
            )) : <p className="text-dim" style={{ textAlign: 'center', padding: '64px 0' }}>没有找到相关文章</p>}
          </div>
        ) : (
          <p className="text-dim" style={{ textAlign: 'center', padding: '64px 0' }}>输入关键词搜索文章</p>
        )}
      </div>
    </div>
  );
}

function FilmsPage({ data }: { data: Extract<StartLegacyRouteData, { kind: 'films' }> }) {
  const link = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ ...data.filters, ...patch });
    for (const key of Array.from(params.keys())) if (!params.get(key)) params.delete(key);
    if ('video_type' in patch || 'year' in patch || 'region' in patch) params.delete('page');
    const qs = params.toString();
    return qs ? `/films?${qs}` : '/films';
  };
  return (
    <div style={{ minHeight: 'calc(100vh - 200px)' }}>
      <PageTitle title="影视" icon="fa-sharp fa-light fa-clapperboard-play" subtitle="在线播放" meta={<><strong>{data.total}</strong> 部影视</>} />
      <div style={{ padding: '24px 32px 32px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {filmTabs.map((tab) => (
            <a key={tab.key || 'all'} href={link({ video_type: tab.key })} style={{ flexShrink: 0, padding: '7px 14px', fontSize: 13, fontWeight: 500, borderRadius: 999, textDecoration: 'none', background: data.filters.video_type === tab.key ? 'var(--color-primary)' : 'var(--color-bg-soft)', color: data.filters.video_type === tab.key ? '#fff' : 'var(--color-text-main)' }}>
              {tab.label}
            </a>
          ))}
        </div>
        {data.items.length === 0 ? (
          <p className="text-dim" style={{ textAlign: 'center', padding: '80px 0' }}>暂无影视</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {data.items.map((item: any) => (
              <a key={item.id} href={`/films/${encodeURIComponent(item.slug || item.display_id || item.id)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)', overflow: 'hidden' }}>
                  <div style={{ width: '100%', aspectRatio: '2/3', background: 'var(--color-bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.cover_url ? <img src={item.cover_url} alt={item.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fa-sharp fa-light fa-clapperboard-play" style={{ fontSize: 36, color: 'var(--color-text-dim)' }} />}
                  </div>
                  <div style={{ padding: 10 }}>
                    <h3 className="text-main" style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
                    <p className="text-sub" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[item.meta?.year, item.meta?.region].filter(Boolean).join(' · ') || '-'}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
        {data.totalPages > 1 ? (
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 6, fontSize: 13 }}>
            {data.page > 1 ? <a href={link({ page: String(data.page - 1) })} style={{ padding: '6px 14px', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text-main)' }}>上一页</a> : null}
            <span style={{ padding: '6px 14px', color: 'var(--color-text-sub)' }}>第 {data.page} / {data.totalPages} 页</span>
            {data.page < data.totalPages ? <a href={link({ page: String(data.page + 1) })} style={{ padding: '6px 14px', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text-main)' }}>下一页</a> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DateArchive({ data }: { data: Extract<StartLegacyRouteData, { kind: 'date' }> }) {
  const title = data.day
    ? `${data.year}/${String(data.month).padStart(2, '0')}/${String(data.day).padStart(2, '0')} 归档`
    : data.month
      ? `${data.year}/${String(data.month).padStart(2, '0')} 归档`
      : `${data.year} 年度归档`;
  return (
    <div>
      <PageTitle title={title} icon="fa-regular fa-calendar" meta={<><strong>{data.posts.length}</strong> 篇文章</>} />
      <div style={{ padding: '0 32px 32px' }}>
        {data.posts.length ? data.posts.map((post: any) => (
          <PostLink key={post.id} post={post} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-divider)', textDecoration: 'none' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-dim)', width: 48, flexShrink: 0 }}>{formatMonthDayInTimeZone(postDateInput(post), data.timeZone)}</span>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
          </PostLink>
        )) : <p className="text-dim" style={{ textAlign: 'center', padding: '64px 0' }}>暂无文章</p>}
      </div>
    </div>
  );
}

export function StartLegacyPage({ data }: { data: StartLegacyRouteData }) {
  return (
    <Shell data={data}>
      {(() => {
        if (data.kind === 'home' && data.ctx) {
          const theme = getThemeComponents(data.ctx.theme.name);
          return <theme.HomePage posts={data.posts} page={data.page} totalPages={data.totalPages} categories={data.categories} archiveStats={data.archiveStats} latestMoment={data.latestMoment} latestComments={data.latestComments} perPage={data.perPage} />;
        }
        if (data.kind === 'post' && data.ctx) {
          const theme = getThemeComponents(data.ctx.theme.name);
          return <theme.PostPage post={data.post} options={data.options} />;
        }
        if (data.kind === 'archives') {
          const theme = getThemeComponents(data.ctx.theme.name);
          const Component = theme.ArchivePage || DefaultArchivePage;
          return <Component posts={data.posts} categories={data.ctx.categories} tags={data.ctx.tags} stats={data.ctx.archiveStats} timeZone={data.ctx.timeZone} />;
        }
        if (data.kind === 'categories') {
          const theme = getThemeComponents(data.ctx.theme.name);
          const Component = theme.CategoriesPage || DefaultCategoriesPage;
          return <Component categories={data.ctx.categories} />;
        }
        if (data.kind === 'category') {
          const theme = getThemeComponents(data.ctx.theme.name);
          const Component = theme.CategoryPage || DefaultCategoryPage;
          return <Component category={data.category} posts={data.posts} timeZone={data.ctx.timeZone} />;
        }
        if (data.kind === 'tags') {
          const theme = getThemeComponents(data.ctx.theme.name);
          const Component = theme.TagsPage || DefaultTagsPage;
          return <Component tags={data.ctx.tags} />;
        }
        if (data.kind === 'tag') {
          const theme = getThemeComponents(data.ctx.theme.name);
          const Component = theme.TagPage || DefaultTagPage;
          return <Component tag={data.tag} posts={data.posts} timeZone={data.ctx.timeZone} />;
        }
        if (data.kind === 'about') return <AboutContent />;
        if (data.kind === 'coding') {
          return data.html
            ? <div dangerouslySetInnerHTML={{ __html: data.html }} />
            : <p className="text-dim" style={{ textAlign: 'center', padding: '80px 0' }}>Coding 数据暂时无法加载。</p>;
        }
        if (data.kind === 'footprints') return <FootprintsClient initialRows={data.rows} options={data.options} />;
        if (data.kind === 'moments') return <MomentsClient initialLoaded initialMoments={data.moments} initialTags={data.tags} initialFetchedAt={data.fetchedAt} />;
        if (data.kind === 'client' && data.page === 'links') return <LinksClient initialLinks={data.items || []} initialOptions={data.ctx?.options || {}} />;
        if (data.kind === 'client' && data.page === 'feeds') return <FeedsClient />;
        if (data.kind === 'client' && data.page === 'albums') return <AlbumsClient initialAlbums={data.items || []} />;
        if (data.kind === 'client' && data.page === 'music') return <MusicClient initialItems={data.items || []} />;
        if (data.kind === 'shelf') return <MediaGrid data={data} />;
        if (data.kind === 'search') return <SearchPage data={data} />;
        if (data.kind === 'films') return <FilmsPage data={data} />;
        if (data.kind === 'date') return <DateArchive data={data} />;
        if (data.kind === 'not-found' && data.ctx) return <DefaultNotFoundPage />;
        if (data.kind === 'post') return (
          <article className="start-article">
            <Link to="/" className="text-link">返回首页</Link>
            <h1>{data.post.title}</h1>
            {data.post.excerpt ? <p className="lede">{data.post.excerpt}</p> : null}
            <div className="article-body" dangerouslySetInnerHTML={{ __html: String(data.post.content || data.post.html || '') }} />
          </article>
        );
        return (
          <section className="hero-band">
            <div>
              <p className="eyebrow">404</p>
              <h1>页面未找到</h1>
              <p className="lede">这个地址暂时没有可显示的内容。</p>
            </div>
          </section>
        );
      })()}
    </Shell>
  );
}
