import { describe, expect, test } from 'bun:test';
import type { ThemeContextData } from '../src/web/lib/theme-context';
import { getAvailableThemes, getThemeManifest } from '../src/web/lib/theme';
import { startDocumentLinks } from '../../start/src/lib/document';

function context(themeName = 'Azure'): ThemeContextData {
  const manifest = getThemeManifest(themeName);
  return {
    site: { title: 'Site', subtitle: '', description: '', url: '', logo: '', darkLogo: '', favicon: '/site.ico' },
    owner: { nickname: '', bio: '', avatar: '', url: '', socials: {} },
    menus: {}, categories: [], tags: [],
    archiveStats: { post_count: 0, comment_count: 0, word_count: 0, days: 0, total_views: 0, heatmap: [] },
    locale: 'zh-CN', timeZone: 'Asia/Tashkent',
    theme: { name: themeName, accent: 'blue', manifest },
    options: {},
  };
}

describe('TanStack Start document assets', () => {
  test('loads shared fonts before the active theme stylesheet', () => {
    const azureVersion = getThemeManifest('Azure').version;
    expect(startDocumentLinks(context()).map((link) => link.href)).toEqual([
      '/site.ico',
      // iOS 主屏图标和 PWA manifest：固定路径，与 favicon 一同由后台上传生成
      '/apple-touch-icon.png',
      '/site.webmanifest',
      'https://static.bluecdn.com',
      'https://img.ficor.net',
      // FontAwesome 的 @font-face 全是 font-display: block —— 字体到齐前图标
      // 完全不可见，到齐那一刻整批显形。四个实际用到的字族（solid 85 处 /
      // regular 111 处 / brands 22 处 / light 50 处）都要 preload，抢在
      // render-blocking 样式表（实测 1.3s 才齐）之前开始下。
      'https://static.bluecdn.com/libs/fontawesome/7.3.1/webfonts/fa-solid-900.woff2',
      'https://static.bluecdn.com/libs/fontawesome/7.3.1/webfonts/fa-regular-400.woff2',
      'https://static.bluecdn.com/libs/fontawesome/7.3.1/webfonts/fa-brands-400.woff2',
      'https://static.bluecdn.com/libs/fontawesome/7.3.1/webfonts/fa-light-300.woff2',
      'https://static.bluecdn.com/libs/fontawesome/7.3.1/css/all.min.css',
      'https://static.bluecdn.com/fonts/noto-sans-sc.css',
      'https://static.bluecdn.com/fonts/alimama-fangyuanti.css',
      'https://static.bluecdn.com/fonts/luo.css',
      // 下面三份原先是 globals.css 里的 `@import url(...)`：CSS @import 要等宿主
      // 样式表下载解析完才发起请求，等于给首屏多串一截关键路径；改由 <link> 与
      // 其它样式表并行发起后，必须出现在主题样式表之前。
      'https://static.bluecdn.com/fonts/fugaz-one.css',
      'https://static.bluecdn.com/fonts/ubuntu.css',
      'https://static.bluecdn.com/fonts/google-sans-code.css',
      `/themes/Azure/styles.css?v=${azureVersion}`,
    ]);
  });

  test('does not inject theme-specific CSS without server context', () => {
    const links = startDocumentLinks(null).map((link) => link.href);
    expect(links).toContain('https://static.bluecdn.com/fonts/noto-sans-sc.css');
    expect(links.some((href) => href.startsWith('/themes/'))).toBe(false);
  });

  test('injects the selected stylesheet for every built-in theme', () => {
    for (const themeName of getAvailableThemes()) {
      const manifest = getThemeManifest(themeName);
      const links = startDocumentLinks(context(themeName)).map((link) => link.href);
      expect(links).toContain(`/themes/${themeName}/styles.css?v=${manifest.version}`);
    }
  });
});
