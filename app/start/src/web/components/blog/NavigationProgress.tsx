'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';

/**
 * 顶部导航进度条。点击站内链接后 router 要先跑 loader 拿数据，这段时间
 * 页面停在原处、只有浏览器标签页在转圈 —— 站内没有任何反馈。这个组件补
 * 上那条反馈。
 *
 * 三点设计取舍：
 *
 * 1. 延迟 APPEAR_DELAY_MS 才出现。缓存命中或本机开发时导航往往几十毫秒
 *    就完成，立刻显示的话进度条会闪一下就没了，比没有更烦人。
 *
 * 2. 进度用 JS 按指数逼近 CEILING，而不是 CSS keyframes 从 0 跑到 90%。
 *    真实耗时不可知，keyframes 得写死一个总时长，导航提前结束时宽度还在
 *    20% 就要跳到 100%，看着是「卡一下然后蹦满」。指数逼近的好处是前期
 *    快、后期渐慢，永远到不了 100%，收尾时从当前宽度平滑推到满格。
 *
 * 3. 挂在 Suspense 外面。放里面的话 pending 期间会被 fallback 一起换掉，
 *    正好在最需要它的时候消失。
 */
export const APPEAR_DELAY_MS = 150;
const FADE_OUT_MS = 320;
const TICK_MS = 120;
/** 进度条封顶，留一截给「真的加载完了」用。 */
export const CEILING = 92;
/** 每次 tick 吃掉剩余距离的比例，越大越急。 */
const EASE = 0.12;

/**
 * 下一帧的进度值：吃掉「当前位置到封顶」剩余距离的固定比例。前期步子大、
 * 越接近封顶越慢，且永远到不了 CEILING —— 所以进度条不会在导航还没结束
 * 时就走满、停在那里假装卡死。
 */
export function nextProgress(current: number) {
  return current + (CEILING - current) * EASE;
}

type Phase = 'idle' | 'loading' | 'done';

export default function NavigationProgress() {
  const isNavigating = useRouterState({ select: (state) => state.status === 'pending' });
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  // 导航结束时要判断「之前到底有没有显示过」—— 没显示过（快导航被
  // APPEAR_DELAY_MS 挡掉）就直接回 idle，不该闪一下满格再淡出。
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  useEffect(() => {
    if (isNavigating) {
      const timer = window.setTimeout(() => {
        setProgress(0);
        setPhase('loading');
      }, APPEAR_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    if (phaseRef.current === 'idle') return;
    setPhase('done');
    setProgress(100);
    const timer = window.setTimeout(() => setPhase('idle'), FADE_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [isNavigating]);

  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = window.setInterval(() => setProgress(nextProgress), TICK_MS);
    return () => window.clearInterval(timer);
  }, [phase]);

  if (phase === 'idle') return null;

  return (
    <div
      className={`nav-progress nav-progress--${phase}`}
      style={{ width: `${progress}%` }}
      role="presentation"
      aria-hidden="true"
    />
  );
}
