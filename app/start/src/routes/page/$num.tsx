import { createFileRoute, redirect } from '@tanstack/react-router';
import { PublicPage } from '../../components/PublicPage';
import { loadPublicPage, publicPageHead, publicRouteNumber } from '../../lib/public-route';

export const Route = createFileRoute('/page/$num')({
  loader: ({ params, preload }) => {
    const page = publicRouteNumber(params.num, 1);
    if (page === 1) throw redirect({ to: '/' });
    return loadPublicPage({ kind: 'home', page }, preload);
  },
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: PaginatedHomePage,
});

function PaginatedHomePage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
