import { describe, expect, test } from 'bun:test';
import { isAdminAssetPath } from '../../start/src/routes/admin/$';

describe('admin shell performance safeguards', () => {
  test('recognizes file requests so missing chunks cannot fall back to HTML', () => {
    expect(isAdminAssetPath('assets/index-abc123.js')).toBe(true);
    expect(isAdminAssetPath('assets/index-abc123.css')).toBe(true);
    expect(isAdminAssetPath('posts')).toBe(false);
    expect(isAdminAssetPath('posts/edit/42')).toBe(false);
  });

  test('uses router-aware lazy components for intent preloading', async () => {
    const source = await Bun.file('app/admin/src/App.tsx').text();
    expect(source).toContain('lazyRouteComponent');
    expect(source).toContain("const DashboardHome = lazyRouteComponent");
    expect(source).not.toMatch(/\blazy\(\(\) => import/);
  });

  test('does not put remote font stylesheets on the admin render path', async () => {
    const css = await Bun.file('app/admin/src/styles/globals.css').text();
    const html = await Bun.file('app/admin/index.html').text();
    expect(css).not.toContain('static.bluecdn.com/fonts');
    expect(html).toContain('rel="preload" as="style"');
  });

  test('caches remote release metadata and keeps explicit refresh support', async () => {
    const service = await Bun.file('app/server/src/routes/compat.ts').text();
    const route = await Bun.file('app/start/src/routes/api/v1/admin/system/$action.ts').text();
    expect(service).toContain('releaseListCacheTtlMs = 10 * 60 * 1000');
    expect(service).toContain('releaseListRequest');
    expect(route).toContain("searchParams.get('refresh') === '1'");
  });
});
