import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/moments')({
  loader: () => loadPublicPage({ kind: 'moments' }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: MomentsPage,
});

function MomentsPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
