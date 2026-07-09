import { createServerFn } from '@tanstack/react-start';
import { dataOf, fetchJson } from './api';

export const loadStartPost = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const postRes = await fetchJson(`/posts/slug/${encodeURIComponent(data.slug)}?track=1`).catch(() => ({ data: null }));
    const post = dataOf<any | null>(postRes, null);
    const commentsRes = post?.id
      ? await fetchJson(`/posts/${post.id}/comments`).catch(() => ({ data: [] }))
      : { data: [] };

    return {
      post,
      comments: dataOf<any[]>(commentsRes, []),
    };
  });
