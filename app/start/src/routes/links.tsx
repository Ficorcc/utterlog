import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/links')({
  loader: ({ preload }) => loadPublicPage({ kind: 'links' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: LinksPage,
});

function LinksPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
