import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../../components/PublicPage';
import { loadPublicPage, publicPageHead, publicRouteNumber } from '../../lib/public-route';

export const Route = createFileRoute('/date/$year')({
  loader: ({ params, preload }) => loadPublicPage({
    kind: 'date',
    year: publicRouteNumber(params.year, 1970, 9999),
  }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: YearArchivePage,
});

function YearArchivePage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
