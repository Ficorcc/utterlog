import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/goods')({
  loader: ({ preload }) => loadPublicPage({ kind: 'shelf', shelf: 'goods' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: GoodsPage,
});

function GoodsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
