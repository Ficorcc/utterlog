import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../../lib/public-route';

export const Route = createFileRoute('/posts/$slug')({
  loader: ({ params }) => loadPublicPage({ kind: 'post', slug: params.slug }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: StartPostPage,
});

function StartPostPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
