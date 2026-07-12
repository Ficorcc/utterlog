import { createServerFn } from '@tanstack/react-start';
import { getPostBySlug, listPostComments } from '../../../server/src/public-read';
import { loadStartThemeContextDirect } from './theme';

type StartPostResponse = {
  ctx: Awaited<ReturnType<typeof loadStartThemeContextDirect>> | null;
  post: any | null;
  comments: any[];
};

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
  .handler(async ({ data }): Promise<StartPostResponse> => {
    const [ctx, post] = await Promise.all([
      safe(loadStartThemeContextDirect(), null),
      safe(getPostBySlug(data.slug, true), null),
    ]);
    const comments = post?.id ? await safe(listPostComments(Number(post.id)), []) : [];

    return {
      ctx,
      post,
      comments,
    };
  });
