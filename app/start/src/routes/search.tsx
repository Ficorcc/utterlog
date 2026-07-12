import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
  loaderDeps: ({ search }) => ({ query: search.q }),
  loader: ({ deps }) => loadPublicPage({ kind: 'search', query: deps.query }),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: SearchPage,
});

function SearchPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
