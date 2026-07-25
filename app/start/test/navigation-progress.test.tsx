import { beforeAll, expect, mock, test } from 'bun:test';
import { renderToString } from 'react-dom/server';

// 顶部导航进度条。这里测两件 renderToString 能覆盖的事：SSR 不输出节点、
// 进度推进公式不会走满或倒退。phase 的时序（150ms 延迟出现、收尾淡出）要
// 真实的 effect + 定时器才跑得起来，这里不假装测了 —— 那部分靠浏览器实测。
//
// mock.module 是整个测试进程共享的，所以必须把原模块的导出摊平带上：只返回
// { useRouterState } 会让同一次 bun test 里其它文件 import createFileRoute /
// Link / useRouter 时报 "Export named ... not found"。
const actual = await import('@tanstack/react-router');
mock.module('@tanstack/react-router', () => ({
  ...actual,
  // 首屏渲染时 phase 恒为 'idle'（effect 还没跑），返回值不影响本文件断言。
  useRouterState: () => false,
}));

let NavigationProgress: typeof import('../src/web/components/blog/NavigationProgress')['default'];
let nextProgress: typeof import('../src/web/components/blog/NavigationProgress')['nextProgress'];
let CEILING: number;

beforeAll(async () => {
  const mod = await import('../src/web/components/blog/NavigationProgress');
  NavigationProgress = mod.default;
  nextProgress = mod.nextProgress;
  CEILING = mod.CEILING;
});

test('SSR 不渲染任何节点，首屏 HTML 里不会多出一个进度条', () => {
  // 进度条是纯客户端反馈。若 SSR 输出了节点，hydration 时客户端算出
  // phase='idle' 又要把它摘掉，白惹一次不匹配。
  expect(renderToString(<NavigationProgress />)).toBe('');
});

test('真实导航时长内进度严格递增且不越过封顶', () => {
  // 60 个 tick ≈ 7 秒，比任何正常导航都长。超过这个量级浮点会收敛到精度
  // 极限、不再变化，那已经不是需要保证「每帧都在动」的区间了。
  let value = 0;
  for (let i = 0; i < 60; i++) {
    const next = nextProgress(value);
    expect(next).toBeGreaterThan(value);
    expect(next).toBeLessThan(CEILING);
    value = next;
  }
  // 7 秒后应该已经很贴近封顶 —— 说明公式不会慢到肉眼看着不动。
  expect(value).toBeGreaterThan(CEILING - 1);
});

test('无论迭代多久都不会走满，收尾时永远有一截可走', () => {
  // 封顶留的余量是给「加载真的完成」那一下用的：没有它，收尾时宽度已经
  // 100%，用户看不到走满的动作，只会看到凭空消失。
  expect(CEILING).toBeLessThan(100);
  let value = 0;
  for (let i = 0; i < 5000; i++) value = nextProgress(value);
  expect(value).toBeLessThan(CEILING);
});

test('开头几步就要有明显位移，不能让用户以为没反应', () => {
  // 第一个 tick（120ms 后）就该走掉可见的一截。
  expect(nextProgress(0)).toBeGreaterThan(5);
});
