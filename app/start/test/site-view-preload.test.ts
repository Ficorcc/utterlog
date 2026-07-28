import { describe, expect, test } from 'bun:test';
import { validatePublicPageRequest } from '../src/server/public-pages';

/**
 * 全站浏览量不该把「预取」算进去。
 *
 * 前台开着 defaultPreload='intent'：鼠标划过站内链接就会跑一遍路由 loader，
 * 而 loader 调的正是记浏览量的那个 server fn。用户一篇没点，在首页扫一眼
 * 文章列表就能刷出十几次浏览量 —— 页脚数字虚高就是这么来的。
 *
 * 计数条件写在 server fn 里（`if (!data.preload)`），这里锁的是这条链路的
 * 前半段：preload 标记必须原样穿过校验，不能被丢掉。丢了的话计数条件永远
 * 为真，等于没修。
 */

describe('preload 标记要穿过请求校验', () => {
  test('预取请求的标记保留下来', () => {
    const req = validatePublicPageRequest({ kind: 'home', page: 1, preload: true });
    expect(req.preload).toBe(true);
  });

  test('真实导航是 false，不是 undefined —— 计数分支要能明确判定', () => {
    const req = validatePublicPageRequest({ kind: 'home', page: 1, preload: false });
    expect(req.preload).toBe(false);
  });

  test('没带这个字段时按真实导航算 —— 漏传不能变成不计数', () => {
    const req = validatePublicPageRequest({ kind: 'home', page: 1 });
    expect(req.preload).toBe(false);
  });

  test('每种页面类型都要带上，不能只有首页生效', () => {
    const cases: Record<string, unknown>[] = [
      { kind: 'home', page: 2 },
      { kind: 'post', slug: 'hello' },
      { kind: 'archives' },
      { kind: 'category', slug: 'tech' },
      { kind: 'tag', slug: 'bun' },
      { kind: 'search', query: 'x' },
      { kind: 'shelf', shelf: 'books' },
      { kind: 'films', page: 1 },
      { kind: 'date', year: 2026 },
      { kind: 'permalink', pathname: '/a/b' },
    ];
    for (const base of cases) {
      expect(validatePublicPageRequest({ ...base, preload: true }).preload).toBe(true);
      expect(validatePublicPageRequest({ ...base, preload: false }).preload).toBe(false);
    }
  });

  test('preload 不影响取数本身 —— 预取和真实导航拿到的是同一份请求', () => {
    const preloaded = validatePublicPageRequest({ kind: 'post', slug: 'hello', preload: true });
    const navigated = validatePublicPageRequest({ kind: 'post', slug: 'hello', preload: false });
    const { preload: _a, ...restPreloaded } = preloaded as Record<string, unknown>;
    const { preload: _b, ...restNavigated } = navigated as Record<string, unknown>;
    expect(restPreloaded).toEqual(restNavigated);
  });

  test('乱七八糟的值不会被当成 true', () => {
    // 只有真值才算预取；字符串 'false' 是真值，但客户端传的是布尔，不必特殊处理
    expect(validatePublicPageRequest({ kind: 'home', preload: 0 }).preload).toBe(false);
    expect(validatePublicPageRequest({ kind: 'home', preload: null }).preload).toBe(false);
    expect(validatePublicPageRequest({ kind: 'home', preload: undefined }).preload).toBe(false);
  });
});
