import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/archives')({
  loader: () => loadPublicPage({ kind: 'archives' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: ArchivesPage,
});

function ArchivesPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
