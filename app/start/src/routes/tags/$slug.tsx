import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../../lib/public-route';

export const Route = createFileRoute('/tags/$slug')({
  loader: ({ params, preload }) => loadPublicPage({ kind: 'tag', slug: params.slug }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: TagPage,
});

function TagPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
