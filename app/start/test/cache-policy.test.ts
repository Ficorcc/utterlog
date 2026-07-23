import { expect, test } from 'bun:test';
import { isPublicCacheablePage, isVisitorPersonalizedPage } from '../src/server/cache-policy';

test('home and paginated home are visitor-personalized (never CDN-cached)', () => {
  for (const path of ['/', '/page/1', '/page/12', '/page/12/']) {
    expect(isVisitorPersonalizedPage(path)).toBe(true);
    expect(isPublicCacheablePage(path)).toBe(false);
  }
});

test('public content pages are cacheable', () => {
  for (const path of [
    '/archives',
    '/archives/33',
    '/archives/33/',
    '/categories',
    '/categories/code',
    '/tags/PHP',
    '/date/2026/04',
    '/about',
    '/coding',
    '/moments',
    '/footprints',
    '/albums',
    '/music',
    '/movies',
    '/films',
    '/films/8',
    '/books',
    '/goods',
    '/games',
    '/links',
    '/feeds',
  ]) {
    expect(isPublicCacheablePage(path)).toBe(true);
  }
});

test('private / dynamic paths are not cacheable', () => {
  for (const path of [
    '/',
    '/page/2',
    '/admin',
    '/admin/posts',
    '/login',
    '/install',
    '/search',
    '/api/v1/posts',
    '/aboutus', // must not match `/about` via loose prefix
    '/categorieslist', // must not match `/categories`
  ]) {
    expect(isPublicCacheablePage(path)).toBe(false);
  }
});
