import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/footprints')({
  loader: () => loadPublicPage({ kind: 'footprints' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: FootprintsPage,
});

function FootprintsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
