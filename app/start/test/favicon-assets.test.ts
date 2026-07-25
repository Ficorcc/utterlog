import { describe, expect, test } from 'bun:test';
import { FAVICON_PNG_ASSETS } from '../src/backend/media/favicon';

// favicon 上传时除了 .ico 还要生成一套 PNG。这些文件名不是随便起的 ——
// iOS 只认 apple-touch-icon.png，PWA manifest 认 android-chrome-192/512，
// 改名字等于这些客户端拿不到图标，所以锁死。
describe('favicon 图标集', () => {
  test('文件名与尺寸符合各客户端的固定约定', () => {
    const byName = Object.fromEntries(FAVICON_PNG_ASSETS.map((a) => [a.name, a.size]));
    expect(byName['favicon-16x16.png']).toBe(16);
    expect(byName['favicon-32x32.png']).toBe(32);
    // iOS 添加到主屏：Safari 只查这一个固定文件名
    expect(byName['apple-touch-icon.png']).toBe(180);
    // PWA：manifest 里引用的就是这两张
    expect(byName['android-chrome-192x192.png']).toBe(192);
    expect(byName['android-chrome-512x512.png']).toBe(512);
  });

  test('文件名里的尺寸和声明的尺寸一致', () => {
    for (const { name, size } of FAVICON_PNG_ASSETS) {
      const inName = name.match(/(\d+)x(\d+)/);
      if (!inName) continue;
      expect(Number(inName[1])).toBe(size);
      expect(Number(inName[2])).toBe(size);
    }
  });

  test('每个文件名都能被 branding 静态路由放行', () => {
    // 与 server/branding-assets.ts 的 brandingPath 保持一致：名字里带连字符
    // 和数字的图标当初就是因为没放行才 404 的。
    const brandingPath = /^\/(favicon|logo|dark-logo|favicon-\d+x\d+|apple-touch-icon|android-chrome-\d+x\d+)\.([a-z0-9]+)$/i;
    for (const { name } of FAVICON_PNG_ASSETS) {
      expect(`/${name}`).toMatch(brandingPath);
    }
    expect('/favicon.ico').toMatch(brandingPath);
  });

  test('manifest 只会引用 192 及以上的图标', () => {
    // 小尺寸进 manifest 没意义，安装 PWA 时系统要的是大图
    const forManifest = FAVICON_PNG_ASSETS.filter((a) => a.size >= 192);
    expect(forManifest.map((a) => a.name)).toEqual([
      'android-chrome-192x192.png',
      'android-chrome-512x512.png',
    ]);
  });
});
