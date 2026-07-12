import { describe, expect, test } from 'bun:test';
import { startRouteMeta } from '../../start/src/lib/route-meta';

const ctx = {
  site: { title: '西风' },
} as any;

describe('TanStack Start route metadata', () => {
  test('uses post SEO fields when available', () => {
    expect(startRouteMeta({
      kind: 'post',
      ctx,
      post: { title: '原标题', excerpt: '摘要', seo: { title: 'SEO 标题', description: 'SEO 描述' } },
      options: {},
    })).toEqual({ title: 'SEO 标题 - 西风', description: 'SEO 描述' });
  });

  test('names collection and dated archive pages', () => {
    expect(startRouteMeta({ kind: 'moments', ctx, moments: [], tags: [], fetchedAt: 0 }).title).toBe('说说 - 西风');
    expect(startRouteMeta({ kind: 'date', ctx, posts: [], year: 2026, month: 7, timeZone: 'UTC' }).title).toBe('2026/07 归档 - 西风');
  });
});
