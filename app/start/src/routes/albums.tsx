import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/albums')({
  loader: ({ preload }) => loadPublicPage({ kind: 'albums' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: AlbumsPage,
});

function AlbumsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
