import { createFileRoute } from '@tanstack/react-router';
import { StartLegacyPage } from '../components/StartLegacyPage';
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
  loader: ({ params, deps }) => {
    const splat = String(params._splat || '');
    return loadStartLegacyRoute({ data: { pathname: `/${splat}`, search: deps } });
  },
  component: StartCatchAll,
});

function StartCatchAll() {
  const data = Route.useLoaderData();
  return <StartLegacyPage data={data} />;
}
