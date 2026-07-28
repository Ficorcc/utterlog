import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '../components/PublicPage';
import { loadPublicPage, publicPageHead } from '../lib/public-route';

export const Route = createFileRoute('/books')({
  loader: ({ preload }) => loadPublicPage({ kind: 'shelf', shelf: 'books' }, preload),
  head: ({ loaderData }) => publicPageHead(loaderData),
  component: BooksPage,
});

function BooksPage() {
  return <PublicPage data={Route.useLoaderData()} />;
}
