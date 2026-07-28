import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../../../components/PublicPage';
import { loadPublicPage, publicPageHead, publicRouteNumber } from '../../../lib/public-route';

export const Route = createFileRoute('/date/$year/$month')({
  loader: ({ params, preload }) => loadPublicPage({
    kind: 'date',
    year: publicRouteNumber(params.year, 1970, 9999),
    month: publicRouteNumber(params.month, 1, 12),
  }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: MonthArchivePage,
});

function MonthArchivePage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
