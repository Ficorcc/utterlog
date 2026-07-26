import { describe, expect, test } from 'bun:test';
import { extractIconCandidates } from '../src/backend/services/link-icons';
import { assertPublicHttpUrl, normalizePublicHttpUrl } from '../src/backend/http/public-url';

/**
 * 友链图标抓取。
 *
 * 这里抓的是**用户填进后台的任意 URL**，所以第一位是 SSRF：内网地址必须进不去，
 * 跳转也不能把校验绕过去（公网首页 302 到 127.0.0.1 是最常见的写法，抓取实现
 * 因此用 redirect:'manual' 逐跳校验，而不是让 fetch 自动跟随）。
 */

describe('SSRF 防护', () => {
  test('本机和内网地址一律拒绝', () => {
    for (const bad of [
      'http://localhost/favicon.ico',
      'http://127.0.0.1/',
      'http://127.0.0.1:9260/api/v1/admin/stats',
      'http://0.0.0.0/',
      'http://10.0.0.5/',
      'http://172.16.3.9/',
      'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data/',  // 云厂商元数据服务
      'http://[::1]/',
      'http://[fd00::1]/',
    ]) {
      expect(() => normalizePublicHttpUrl(bad)).toThrow();
    }
  });

  test('非 http(s) 协议拒绝', () => {
    for (const bad of ['file:///etc/passwd', 'gopher://evil.com/', 'ftp://example.com/x']) {
      expect(() => normalizePublicHttpUrl(bad)).toThrow();
    }
  });

  test('URL 里夹带凭据的拒绝', () => {
    expect(() => normalizePublicHttpUrl('http://user:pass@example.com/')).toThrow();
  });

  test('域名解析到内网的也要拒绝 —— 光看字面量挡不住 DNS 指回内网', async () => {
    // localtest.me 这类域名公开解析到 127.0.0.1，是绕过字面量检查的经典手法。
    // 解析不到（离线 / 上游没有这条记录）时同样应该抛错，不能放行。
    await expect(assertPublicHttpUrl('http://localtest.me/favicon.ico')).rejects.toThrow();
  });

  test('正常的公网地址放行', () => {
    expect(normalizePublicHttpUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizePublicHttpUrl('example.com')).toBe('https://example.com');
  });
});

describe('从 HTML 里挑图标', () => {
  const base = 'https://example.com/';

  test('相对地址拼成绝对地址', () => {
    const html = `<link rel="icon" href="/static/fav.png">`;
    expect(extractIconCandidates(html, base)).toEqual(['https://example.com/static/fav.png']);
  });

  test('按 sizes 从大到小排，大图优先', () => {
    const html = `
      <link rel="icon" sizes="32x32" href="/small.png">
      <link rel="apple-touch-icon" sizes="180x180" href="/big.png">
      <link rel="icon" sizes="16x16" href="/tiny.png">
    `;
    expect(extractIconCandidates(html, base)).toEqual([
      'https://example.com/big.png',
      'https://example.com/small.png',
      'https://example.com/tiny.png',
    ]);
  });

  test('认得 shortcut icon 和单引号、大写标签', () => {
    const html = `<LINK REL='shortcut icon' HREF='/fav.ico'>`;
    expect(extractIconCandidates(html, base)).toEqual(['https://example.com/fav.ico']);
  });

  test('data: 内联图标跳过 —— 抓下来也没有可缓存的地址', () => {
    const html = `<link rel="icon" href="data:image/png;base64,iVBORw0KGgo=">`;
    expect(extractIconCandidates(html, base)).toEqual([]);
  });

  test('不是图标的 link 一律忽略', () => {
    const html = `
      <link rel="stylesheet" href="/app.css">
      <link rel="canonical" href="https://example.com/post">
      <link rel="preconnect" href="https://cdn.example.com">
    `;
    expect(extractIconCandidates(html, base)).toEqual([]);
  });

  test('重复地址只留一个', () => {
    const html = `
      <link rel="icon" href="/fav.png">
      <link rel="apple-touch-icon" href="/fav.png">
    `;
    expect(extractIconCandidates(html, base)).toEqual(['https://example.com/fav.png']);
  });

  test('跨站的图标地址照样收下 —— 后续抓取还会再过一次 SSRF 校验', () => {
    const html = `<link rel="icon" href="https://cdn.other.com/i.png">`;
    expect(extractIconCandidates(html, base)).toEqual(['https://cdn.other.com/i.png']);
  });

  test('畸形 HTML 不抛异常', () => {
    for (const html of ['', '<link', '<link rel=icon>', '<link rel="icon" href="">', '<link rel="icon" href="::::">']) {
      expect(() => extractIconCandidates(html, base)).not.toThrow();
    }
  });
});
