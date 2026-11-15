'use client';

import { useEffect } from 'react';

/**
 * Robes 的卡片入场动画（cardFadeIn）依赖 JS 给元素补一个 .card-visible 类，
 * 原主题在 main.v2.js 里用 IntersectionObserver 统一处理。
 *
 * 这里放在 Layout 里做同一件事：一次观察器 + MutationObserver 兜住后续路由
 * 新渲染出来的卡片，避免每个组件各自写一份。
 */
/**
 * 选择器集合对齐原主题 main.v2.js 的 WATERFALL_SELECTORS —— 原版就是靠它给
 * 卡片与页面区块补 .card-visible，触发 cardFadeIn 入场动画。
 * 少了任何一个，对应元素就会一直停在 opacity:0 上（看不见但确实在 DOM 里）。
 */
const REVEAL_SELECTORS = [
  '.post-card',
  '.post-card-simple',
  '.friend-feed-card',
  '.cmt-item',
  '.cmt-card',
  '.photo-item',
  '.link-card',
  '.album-card',
  '.pg-arch-row',
  '.abt-head',
  '.abt-stats',
  '.abt-sec',
  '.abt-cta',
].join(',');

/**
 * 兜底扫描：把「已经进入视口、或已经被滚过视口顶部」的卡片直接点亮。
 *
 * 只靠 IntersectionObserver 有一个真实的坑：一次性大距离跳转（点锚点、
 * 浏览器恢复上次的滚动位置、拖动滚动条、程序化 scrollTo）不会让中间
 * 跨过的元素经历「相交 → 不相交」的状态变化 —— 浏览器直接算出新位置，
 * 观察器只汇报一次「不相交」。结果就是中间那一整段内容永远停在
 * opacity:0 上：DOM 里在、看不见。
 *
 * 所以这里按几何位置再扫一遍，凡是落在视口范围内（含已经滚过去的）
 * 都补上 .card-visible。
 */
export function sweepRevealCards(scope: ParentNode = document) {
  if (typeof window === 'undefined') return;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  scope.querySelectorAll<HTMLElement>(REVEAL_SELECTORS).forEach((el) => {
    if (el.classList.contains('card-visible')) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < viewportHeight && rect.bottom > 0) el.classList.add('card-visible');
  });
}

export default function useCardReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => el.classList.add('card-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          if (!target.classList.contains('card-visible')) {
            const parent = target.parentElement;
            const siblings = parent
              ? Array.from(parent.querySelectorAll(REVEAL_SELECTORS))
              : [];
            const index = Math.max(0, siblings.indexOf(target));
            target.style.animationDelay = `${index * 0.04}s`;
            target.classList.add('card-visible');
          }
          observer.unobserve(target);
        });
      },
      { threshold: 0.05 },
    );

    const scan = () => {
      document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => {
        if (!el.classList.contains('card-visible')) observer.observe(el);
      });
    };

    scan();

    // 路由切换 / 异步加载后会插入新卡片，观察新节点。
    const mutations = new MutationObserver(scan);
    const root = document.getElementById('feed') || document.body;
    mutations.observe(root, { childList: true, subtree: true });

    // 滚动兜底。scroll 事件不冒泡，但会在捕获阶段被祖先收到，
    // 所以这里用 capture 监听（内容区 .content-scroll 才是真正的滚动容器）。
    const onScroll = () => sweepRevealCards(root);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    };
  }, []);
}
