import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/categories')({
  loader: ({ preload }) => loadPublicPage({ kind: 'categories' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: CategoriesPage,
});

function CategoriesPage() {
  // /categories/$slug 是本路由的子级；命中子级时必须渲染 Outlet，
  // 否则具体分类的文章列表永远被总览页盖住（tags.tsx 同款处理）。
  const hasCategoryPage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === '/categories/$slug'),
  });
  const data = Route.useLoaderData();
  return hasCategoryPage ? <Outlet /> : <PublicPage data={data} />;
}
