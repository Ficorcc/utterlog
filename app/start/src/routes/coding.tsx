import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/coding')({
  loader: ({ preload }) => loadPublicPage({ kind: 'coding' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: CodingPage,
});

function CodingPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
