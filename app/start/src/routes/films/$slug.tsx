import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../../lib/public-route';

export const Route = createFileRoute('/films/$slug')({
  loader: ({ params, preload }) => loadPublicPage({ kind: 'film', slug: params.slug }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: FilmPage,
});

function FilmPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
