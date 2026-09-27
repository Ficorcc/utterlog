'use client';

// 订阅页主题分发器
//
// v2.3.1 把订阅页的旋转卡片重做成 toolbar + grid/list 切换 + className 驱动
// 的新布局，但相关 CSS 只在 app/web/themes/Nebula/styles.css 里写了，其他主题
// (Azure / Chred / Flux / Renascent / Utterlog) 拿到的是一串没样式的
// .feed-card / .feeds-toolbar 元素，UI 直接错位。
//
// 修复方式：按 useThemeContext().theme.name 分流：
//   - Nebula     → NebulaFeedsView（新版本：toolbar + grid/list）
//   - ShanYing   → ShanYingFeedsView（复刻 WordPress「山映」订阅页：
//                  标签栏 + 竖向条目列表，CSS 在 themes/ShanYing/styles.css）
//   - 其他主题   → LegacyFeedsView（v2.3.0 旋转卡片纯 inline 样式）
//
// 老版本组件不依赖任何主题 class，跨主题安全；Nebula / ShanYing 版本只在
// 各自主题启用，不污染其他主题的视觉。

import { useThemeContext } from '@/lib/theme-context';
import NebulaFeedsView from './NebulaFeedsView';
import LegacyFeedsView from './LegacyFeedsView';
import ShanYingFeedsView from './ShanYingFeedsView';

export default function FeedsClient() {
  const { theme } = useThemeContext();
  if (theme?.name === 'Nebula') return <NebulaFeedsView />;
  if (theme?.name === 'ShanYing') return <ShanYingFeedsView />;
  return <LegacyFeedsView />;
}
