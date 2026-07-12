import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/games')({
  loader: () => loadPublicPage({ kind: 'shelf', shelf: 'games' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: GamesPage,
});

function GamesPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
