import { Link, createFileRoute } from '@tanstack/react-router';
import { loadStartHome } from '../server/home';

export const Route = createFileRoute('/')({
  loader: () => loadStartHome(),
  component: StartHome,
});

function StartHome() {
  const data = Route.useLoaderData();
  const siteTitle = data.options.site_title || 'Utterlog';
  const subtitle = data.options.site_description || data.options.site_subtitle || 'TanStack Start migration preview';

  return (
    <main className="start-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">TanStack Start Preview</p>
          <h1>{siteTitle}</h1>
          <p className="lede">{subtitle}</p>
        </div>
        <div className="stack-card" aria-label="Current migration stack">
          <span>Bun</span>
          <span>TanStack Start</span>
          <span>React 19</span>
          <span>TanStack Router</span>
        </div>
      </section>

      <section className="content-grid">
        <div className="post-list">
          <div className="section-heading">
            <p className="eyebrow">Latest Posts</p>
            <h2>前台 SSR 第一批迁移内容</h2>
          </div>
          {data.posts.length ? (
            data.posts.map((post: any) => (
              <article className="post-row" key={post.id}>
                <div>
                  <h3>
                    <Link to="/posts/$slug" params={{ slug: post.slug || String(post.id) }}>
                      {post.title}
                    </Link>
                  </h3>
                  {post.excerpt ? <p>{post.excerpt}</p> : null}
                </div>
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </article>
            ))
          ) : (
            <p className="empty">还没有读取到文章。请确认旧 API 服务正在运行。</p>
          )}
        </div>

        <aside className="side-panel">
          <p className="eyebrow">Migration Notes</p>
          <h2>先接旧 API，再逐步内聚</h2>
          <p>
            这个入口已经由 TanStack Router loader 在服务端读取数据。下一步可以把文章页、评论区和主题布局迁入这里，
            再考虑把稳定接口改成 TanStack Start server functions。
          </p>
          <dl>
            <div>
              <dt>文章</dt>
              <dd>{data.posts.length}</dd>
            </div>
            <div>
              <dt>分类</dt>
              <dd>{data.categories.length}</dd>
            </div>
            <div>
              <dt>评论</dt>
              <dd>{data.latestComments.length}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}

function formatDate(value: unknown) {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
