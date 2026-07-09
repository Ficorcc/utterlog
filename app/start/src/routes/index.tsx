import { createFileRoute } from '@tanstack/react-router';
import { getThemeComponents } from '@/lib/theme';
import { StartThemeShell } from '../components/StartThemeShell';
import { loadStartHome } from '../server/home';

export const Route = createFileRoute('/')({
  loader: () => loadStartHome(),
  component: StartHome,
});

function StartHome() {
  const data = Route.useLoaderData();

  if (!data.ctx) {
    return (
      <main className="start-shell">
        <section className="hero-band">
          <div>
            <p className="eyebrow">TanStack Start Preview</p>
            <h1>{data.options.site_title || 'Utterlog'}</h1>
            <p className="lede">新前台入口已启动，但当前本地 API 还没有返回完整主题上下文。</p>
          </div>
        </section>
      </main>
    );
  }

  const theme = getThemeComponents(data.ctx.theme.name);
  const ThemeHomePage = theme.HomePage;

  return (
    <StartThemeShell ctx={data.ctx}>
      <ThemeHomePage
        posts={data.posts}
        page={data.page}
        totalPages={data.totalPages}
        categories={data.categories}
        archiveStats={data.archiveStats}
        latestMoment={data.latestMoment}
        latestComments={data.latestComments}
        perPage={data.perPage}
      />
    </StartThemeShell>
  );
}
