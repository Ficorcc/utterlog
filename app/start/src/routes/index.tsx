import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/')({
  loader: ({ preload }) => loadPublicPage({ kind: 'home', page: 1 }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: StartHome,
});

function StartHome() {
  const data = Route.useLoaderData();
  return <PublicPage data={data} />;
}
