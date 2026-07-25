import { expect, test } from 'bun:test';

// 后台 Tabs 的选中态曾经整体失效：样式写的是 `data-[selected]:`，而 Base UI
// 的 Tabs.Tab 实际输出的是 `aria-selected` —— 属性选择器匹配不上，所有 tab
// 看起来都是未选中的，而且这种失效不会报任何错。这里从源码层面守住。
const tabsComponent = await Bun.file('app/admin/src/components/ui/shadcn/tabs.tsx').text();
const settingsPage = await Bun.file('app/admin/src/pages/Settings.tsx').text();

test('基础 Tabs 组件覆盖 aria-selected，不只写 data-[selected]', () => {
  expect(tabsComponent).toContain('aria-selected:');
  // 两种前缀都留着：换库或库改属性时不至于又静默失效
  expect(tabsComponent).toContain('data-[selected]:');
});

test('设置页的 tab 选中态由 activeTab 判断，不依赖组件库属性', () => {
  // 这一页九个 tab，选中态失效很难一眼看出来，所以直接用自己管理的 state
  expect(settingsPage).toContain('const selected = activeTab === tab.id;');
  // 选中时必须有可见的视觉差异：主色 + 下边框
  expect(settingsPage).toContain("'border-primary bg-transparent font-semibold text-primary shadow-none'");
});

test('设置页 tab 栏窄屏横向滚动，不换行', () => {
  // 九个 tab 换行会把下面的表单顶下去半屏
  expect(settingsPage).toContain('flex-nowrap');
  expect(settingsPage).toContain('overflow-x-auto');
});
