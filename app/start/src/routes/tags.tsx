import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/tags')({
  loader: ({ preload }) => loadPublicPage({ kind: 'tags' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: TagsPage,
});

function TagsPage() {
  const hasTagPage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === '/tags/$slug'),
  });
  const data = Route.useLoaderData();
  return hasTagPage ? <Outlet /> : <PublicPage data={data} />;
}
