import { createFileRoute, notFound } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadStartPublicPage } from '../server/public-pages';
import { publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/$')({
  loader: async ({ params, preload }) => {
    const splat = String(params._splat || '');
    const data = await loadStartPublicPage({ data: { kind: 'permalink', pathname: `/${splat}`, preload } });
    if (data.kind === 'not-found') throw notFound();
    return data;
  },
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: StartPermalink,
});

function StartPermalink() {
  const data = Route.useLoaderData();
  return <PublicPage data={data} />;
}
