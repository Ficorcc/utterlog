import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/links')({
  loader: () => loadPublicPage({ kind: 'links' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: LinksPage,
});

function LinksPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
