import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/movies')({
  loader: ({ preload }) => loadPublicPage({ kind: 'shelf', shelf: 'movies' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: MoviesPage,
});

function MoviesPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
