import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/feeds')({
  loader: () => loadPublicPage({ kind: 'feeds' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: FeedsPage,
});

function FeedsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
