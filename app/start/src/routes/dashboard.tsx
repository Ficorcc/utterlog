import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/dashboard')({
  loader: ({ preload }) => loadPublicPage({ kind: 'dashboard' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: DashboardPage,
});

function DashboardPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
