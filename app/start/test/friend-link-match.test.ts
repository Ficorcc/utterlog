import { describe, expect, test } from 'bun:test';
import { buildSiteIndex, matchSiteIndex, normalizeSiteHost, registrableHost, siteMatchKeys } from '../../shared/link-match';

// 评论者填的网址跟友链库比对，命中就在评论上标「友链好友」。
// 标错人比不标更糟 —— 陌生人被挂上友链身份，还会顺带把 Gravatar 头像认到别人头上。

type Link = { id: number; name: string; url: string };
const link = (id: number, name: string, url: string): Link => ({ id, name, url });

describe('域名归一化', () => {
  test('协议、www、端口、路径、大小写都不影响结果', () => {
    for (const input of [
      'https://www.Example.com/blog/',
      'http://example.com',
      'example.com',
      '//example.com/',
      'https://EXAMPLE.com:8443/a/b?c=d',
      'www.example.com/',
    ]) {
      expect(normalizeSiteHost(input)).toBe('example.com');
    }
  });

  test('拿不到主机名时返回空串，不能瞎猜', () => {
    for (const bad of ['', '   ', 'localhost', 'not a url', '/relative/path', 'https://']) {
      expect(normalizeSiteHost(bad)).toBe('');
    }
  });
});

describe('注册域', () => {
  test('普通域名剥到二级', () => {
    expect(registrableHost('blog.zhheo.com')).toBe('zhheo.com');
    expect(registrableHost('a.b.c.example.net')).toBe('example.net');
    expect(registrableHost('example.com')).toBe('example.com');
  });

  test('多级国家域不能被剥成 com.cn', () => {
    expect(registrableHost('blog.example.com.cn')).toBe('example.com.cn');
    expect(registrableHost('shop.example.co.uk')).toBe('example.co.uk');
  });

  test('托管平台域的注册域就是它自己 —— 兜底匹配因此自然失效', () => {
    for (const host of ['alice.github.io', 'myapp.vercel.app', 'blog.pages.dev', 'me.bearblog.dev']) {
      expect(registrableHost(host)).toBe(host);
    }
  });
});

describe('匹配键', () => {
  test('子域站点同时给出精确名和注册域', () => {
    expect(siteMatchKeys('https://blog.zhheo.com/')).toEqual(['blog.zhheo.com', 'zhheo.com']);
  });

  test('注册域跟主机名相同的只给一个键', () => {
    expect(siteMatchKeys('https://example.com')).toEqual(['example.com']);
    expect(siteMatchKeys('https://alice.github.io')).toEqual(['alice.github.io']);
  });
});

describe('友链匹配', () => {
  test('评论网址写法不同也能命中', () => {
    const index = buildSiteIndex([link(1, '晴空树', 'https://pinaland.cn/')], (l) => l.url);
    for (const url of ['https://pinaland.cn', 'http://www.pinaland.cn/about', 'pinaland.cn']) {
      expect(matchSiteIndex(url, index)?.id).toBe(1);
    }
  });

  test('友链是子域、评论填主域时也认得出', () => {
    const index = buildSiteIndex([link(1, '张洪Heo', 'https://blog.zhheo.com/')], (l) => l.url);
    expect(matchSiteIndex('https://zhheo.com', index)?.id).toBe(1);
    expect(matchSiteIndex('https://blog.zhheo.com', index)?.id).toBe(1);
  });

  test('同一托管平台的两个用户绝不能互相认成友链', () => {
    const index = buildSiteIndex([link(1, 'Alice', 'https://alice.github.io')], (l) => l.url);
    expect(matchSiteIndex('https://bob.github.io', index)).toBeUndefined();
    expect(matchSiteIndex('https://github.io', index)).toBeUndefined();
    // 本人还是要能匹配上
    expect(matchSiteIndex('https://alice.github.io/posts/1', index)?.id).toBe(1);
  });

  test('同注册域下有两条友链时，模糊键作废，只认精确匹配', () => {
    const index = buildSiteIndex([
      link(1, '甲的博客', 'https://blog.shared.com'),
      link(2, '乙的小站', 'https://shop.shared.com'),
    ], (l) => l.url);
    // 填 shared.com 无法判断是哪一位 —— 宁可不标
    expect(matchSiteIndex('https://shared.com', index)).toBeUndefined();
    expect(matchSiteIndex('https://blog.shared.com', index)?.id).toBe(1);
    expect(matchSiteIndex('https://shop.shared.com', index)?.id).toBe(2);
  });

  test('精确主机名优先于别人的注册域兜底', () => {
    const index = buildSiteIndex([
      link(1, '主站', 'https://example.com'),
      link(2, '子站', 'https://blog.example.com'),
    ], (l) => l.url);
    expect(matchSiteIndex('https://example.com', index)?.id).toBe(1);
    expect(matchSiteIndex('https://blog.example.com', index)?.id).toBe(2);
  });

  test('无关域名和空值都不命中', () => {
    const index = buildSiteIndex([link(1, '晴空树', 'https://pinaland.cn/')], (l) => l.url);
    for (const url of ['https://evil.com', 'pinaland.cn.evil.com', '', 'not a url']) {
      expect(matchSiteIndex(url, index)).toBeUndefined();
    }
  });

  test('友链网址为空时不进索引，也不会被空网址命中', () => {
    const index = buildSiteIndex([link(1, '没填网址', ''), link(2, '正常', 'https://ok.com')], (l) => l.url);
    expect(index.size).toBe(1);
    expect(matchSiteIndex('', index)).toBeUndefined();
  });
});
