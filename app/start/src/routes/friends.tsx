import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/friends')({
  loader: ({ preload }) => loadPublicPage({ kind: 'friends' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: FriendsPage,
});

function FriendsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
