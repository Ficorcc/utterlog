import { describe, expect, test } from 'bun:test';
import { isVisitorPersonalizedPage } from '../../start/src/server/cache-policy';

describe('visitor IP SSR handling', () => {
  test('keeps EdgeOne client IP forwarding for SSR request helpers', async () => {
    const source = await Bun.file('app/start/src/server/public-pages.ts').text();
    expect(source).toContain("'eo-client-ip': getRequestHeader('eo-client-ip')");
  });

  test('home pages no longer need private SSR caching', () => {
    expect(isVisitorPersonalizedPage('/')).toBe(false);
    expect(isVisitorPersonalizedPage('/page/2')).toBe(false);
    expect(isVisitorPersonalizedPage('/posts/example')).toBe(false);
    expect(isVisitorPersonalizedPage('/api/v1/visitor/geo')).toBe(false);
  });
});
