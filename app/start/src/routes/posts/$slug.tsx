import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { loadStartPost } from '../../server/posts';

export const Route = createFileRoute('/posts/$slug')({
  loader: async ({ params }) => {
    const data = await loadStartPost({ data: { slug: params.slug } });
    if (!data.post) throw notFound();
    return data;
  },
  component: StartPostPage,
});

function StartPostPage() {
  const { post, comments } = Route.useLoaderData();

  return (
    <main className="start-shell start-article">
      <Link to="/" className="text-link">返回首页</Link>
      <article>
        <p className="eyebrow">Post Preview</p>
        <h1>{post.title}</h1>
        {post.excerpt ? <p className="lede">{post.excerpt}</p> : null}
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: String(post.content || post.html || '') }}
        />
      </article>
      <section className="comments-preview">
        <h2>评论预览</h2>
        {comments.length ? (
          comments.slice(0, 8).map((comment: any) => (
            <article className="comment-row" key={comment.id}>
              <strong>{comment.author_name || comment.author || '读者'}</strong>
              <p>{comment.content}</p>
            </article>
          ))
        ) : (
          <p className="empty">暂无评论。</p>
        )}
      </section>
    </main>
  );
}
