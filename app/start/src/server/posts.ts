import { createServerFn } from '@tanstack/react-start';
import { getThemeContextData } from '@/lib/theme-data';
import { dataOf, fetchJson } from './api';

export const loadStartPost = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const [ctx, postRes] = await Promise.all([
      getThemeContextData().catch(() => null),
      fetchJson(`/posts/slug/${encodeURIComponent(data.slug)}?track=1`).catch(() => ({ data: null })),
    ]);
    const post = dataOf<any | null>(postRes, null);
    const commentsRes = post?.id
      ? await fetchJson(`/posts/${post.id}/comments`).catch(() => ({ data: [] }))
      : { data: [] };

    return {
      ctx,
      post,
      comments: dataOf<any[]>(commentsRes, []),
    };
  });
