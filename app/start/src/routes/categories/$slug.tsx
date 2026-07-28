import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../../lib/public-route';

export const Route = createFileRoute('/categories/$slug')({
  loader: ({ params, preload }) => loadPublicPage({ kind: 'category', slug: params.slug }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: CategoryPage,
});

function CategoryPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
