import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/guestbook')({
  loader: ({ preload }) => loadPublicPage({ kind: 'guestbook' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: GuestbookPage,
});

function GuestbookPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
