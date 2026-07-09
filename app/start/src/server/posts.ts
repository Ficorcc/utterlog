import { createServerFn } from '@tanstack/react-start';
import { getThemeContextData } from '@/lib/theme-data';
import { dataOf, fetchJson } from './api';

async function safe<T>(promise: Promise<T>, fallback: T, ms = 1500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch(() => fallback),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const loadStartPost = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const [ctx, postRes] = await Promise.all([
      safe(getThemeContextData(), null),
      safe(fetchJson(`/posts/slug/${encodeURIComponent(data.slug)}?track=1`), { data: null }),
    ]);
    const post = dataOf<any | null>(postRes, null);
    const commentsRes = post?.id
      ? await safe(fetchJson(`/posts/${post.id}/comments`), { data: [] })
      : { data: [] };

    return {
      ctx,
      post,
      comments: dataOf<any[]>(commentsRes, []),
    };
  });
