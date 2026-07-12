import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/albums')({
  loader: () => loadPublicPage({ kind: 'albums' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: AlbumsPage,
});

function AlbumsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
