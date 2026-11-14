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

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);
}
