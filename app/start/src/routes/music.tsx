import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/music')({
  loader: ({ preload }) => loadPublicPage({ kind: 'music' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: MusicPage,
});

function MusicPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
