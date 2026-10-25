import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

function searchText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export const Route = createFileRoute('/films')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search.page) || 1),
    video_type: searchText(search.video_type),
    year: searchText(search.year),
    region: searchText(search.region),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps, preload }) => loadPublicPage({
    kind: 'films',
    page: deps.page,
    videoType: deps.video_type,
    year: deps.year,
    region: deps.region,
  }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: FilmsPage,
});

function FilmsPage() {
  // /films/$slug 是本路由的子级；命中子级时渲染 Outlet，
  // 否则具体影片页永远被列表页盖住（tags.tsx 同款处理）。
  const hasFilmPage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === '/films/$slug'),
  });
  const data = Route.useLoaderData();
  return hasFilmPage ? <Outlet /> : <PublicPage data={data} />;
}
