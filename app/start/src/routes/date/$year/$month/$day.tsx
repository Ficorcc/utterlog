import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../../../../components/PublicPage';
import { loadPublicPage, publicPageHead, publicRouteNumber } from '../../../../lib/public-route';

export const Route = createFileRoute('/date/$year/$month/$day')({
  loader: ({ params }) => loadPublicPage({
    kind: 'date',
    year: publicRouteNumber(params.year, 1970, 9999),
    month: publicRouteNumber(params.month, 1, 12),
    day: publicRouteNumber(params.day, 1, 31),
  }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: DayArchivePage,
});

function DayArchivePage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
