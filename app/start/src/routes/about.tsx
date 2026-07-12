import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/about')({
  loader: () => loadPublicPage({ kind: 'about' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: AboutPage,
});

function AboutPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
