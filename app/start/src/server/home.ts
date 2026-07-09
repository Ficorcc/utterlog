import { createServerFn } from '@tanstack/react-start';
import { dataOf, fetchJson } from './api';

type HomeResponse = {
  posts: any[];
  categories: any[];
  latestComments: any[];
  options: Record<string, string>;
};

export const loadStartHome = createServerFn({ method: 'GET' }).handler(async (): Promise<HomeResponse> => {
  const [optionsRes, postsRes, categoriesRes, commentsRes] = await Promise.all([
    fetchJson('/options').catch(() => ({ data: {} })),
    fetchJson('/posts?page=1&per_page=8&status=publish').catch(() => ({ data: [] })),
    fetchJson('/categories').catch(() => ({ data: [] })),
    fetchJson('/comments?per_page=8&status=approved&exclude_admin=1').catch(() => ({ data: [] })),
  ]);

  return {
    options: dataOf<Record<string, string>>(optionsRes, {}),
    posts: dataOf<any[]>(postsRes, []),
    categories: dataOf<any[]>(categoriesRes, []),
    latestComments: dataOf<any[]>(commentsRes, []),
  };
});
