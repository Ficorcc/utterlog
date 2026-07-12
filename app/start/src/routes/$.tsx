import { createFileRoute, notFound } from '@tanstack/react-router';
import { StartLegacyPage } from '../components/StartLegacyPage';
import { startRouteMeta } from '../lib/route-meta';
import { loadStartLegacyRoute } from '../server/legacy';

export const Route = createFileRoute('/$')({
  validateSearch: (search: Record<string, unknown>) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(search)) {
      if (typeof value === 'string') out[key] = value;
      else if (value != null) out[key] = String(value);
    }
    return out;
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const splat = String(params._splat || '');
    const data = await loadStartLegacyRoute({ data: { pathname: `/${splat}`, search: deps } });
    if (data.kind === 'not-found') throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const meta = startRouteMeta(loaderData);
    return { meta: [
      { title: meta.title },
      ...(meta.description ? [{ name: 'description', content: meta.description }] : []),
    ] };
  },
  component: StartCatchAll,
});

function StartCatchAll() {
  const data = Route.useLoaderData();
  return <StartLegacyPage data={data} />;
}
