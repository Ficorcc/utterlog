import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/')({
  loader: () => loadPublicPage({ kind: 'home', page: 1 }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: StartHome,
});

function StartHome() {
  const data = Route.useLoaderData();
  return <PublicPage data={data} />;
}
