import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/tags')({
  loader: () => loadPublicPage({ kind: 'tags' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: TagsPage,
});

function TagsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
