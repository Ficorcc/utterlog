import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { getThemeComponents } from '@/lib/theme';
import { StartThemeShell } from '../../components/StartThemeShell';
import { startRouteMeta } from '../../lib/route-meta';
import { loadStartPost } from '../../server/posts';

export const Route = createFileRoute('/posts/$slug')({
  loader: async ({ params }) => {
    const data = await loadStartPost({ data: { slug: params.slug } });
    if (!data.post) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.post) return {};
    const meta = startRouteMeta({ kind: 'post', ctx: loaderData.ctx, post: loaderData.post, options: loaderData.ctx?.options || {} });
    return { meta: [
      { title: meta.title },
      ...(meta.description ? [{ name: 'description', content: meta.description }] : []),
    ] };
  },
  component: StartPostPage,
});

function StartPostPage() {
  const { ctx, post } = Route.useLoaderData();

  if (!ctx) {
    return (
      <main className="start-shell start-article">
        <Link to="/" className="text-link">返回首页</Link>
        <article>
          <p className="eyebrow">Post Preview</p>
          <h1>{post.title}</h1>
          {post.excerpt ? <p className="lede">{post.excerpt}</p> : null}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: String(post.content || post.html || '') }} />
        </article>
      </main>
    );
  }

  const theme = getThemeComponents(ctx.theme.name);
  const ThemePostPage = theme.PostPage;

  return (
    <StartThemeShell ctx={ctx}>
      <ThemePostPage post={post} options={ctx.options} />
    </StartThemeShell>
  );
}
