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
    expect(source).not.toMatch(/\blazy\(\(\) => import/);
  });
});
