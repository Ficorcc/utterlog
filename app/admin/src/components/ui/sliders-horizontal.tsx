"use client";

import type { HTMLAttributes } from "react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

export interface SlidersHorizontalIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SlidersHorizontalIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

/**
 * 手柄的横向位移量（用户单位），交给 .icon-translate-x 消费。
 * 原动效改的是 <line> 的 x1/x2 端点：三条竖线（手柄）两端位移相同，
 * 等价于纯平移，用 CSS transform 能 1:1 还原；三行横线（轨道）只动一端，
 * 属于长度变化 —— <line> 的 x1/x2 不在 SVG2 的 geometry properties 里，CSS 动不了，
 * 按约定降级为不动。
 *
 * 降级的可见后果：手柄滑动时轨道缺口留在原地，于是手柄会短暂压在实线上、
 * 原缺口空着。侧栏 28px 尺寸下 1 个用户单位不到 1px，观感上很轻微。真要还原，
 * 得把每行两段线改成整条线 + 动画化 stroke-dasharray/stroke-dashoffset 来移动缺口。
 */
const tickStyle = (dx: number) =>
  ({ "--icon-dx": `${dx}px` }) as React.CSSProperties;

const SlidersHorizontalIcon = forwardRef<
  SlidersHorizontalIconHandle,
  SlidersHorizontalIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
  const [animating, setAnimating] = useState(false);
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => setAnimating(true),
      stopAnimation: () => setAnimating(false),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        setAnimating(true);
      }
    },
    [onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        setAnimating(false);
      }
    },
    [onMouseLeave]
  );

  const tickClassName = cn(
    "icon-transform-snap",
    animating && "icon-translate-x"
  );

  return (
    <div
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="21" x2="14" y1="4" y2="4" />
        <line x1="10" x2="3" y1="4" y2="4" />

        <line x1="21" x2="12" y1="12" y2="12" />
        <line x1="8" x2="3" y1="12" y2="12" />

        <line x1="3" x2="12" y1="20" y2="20" />
        <line x1="16" x2="21" y1="20" y2="20" />

        {/* 三个手柄滑到新位置：14→9、8→14、16→8 */}
        <line
          className={tickClassName}
          style={tickStyle(-5)}
          x1="14"
          x2="14"
          y1="2"
          y2="6"
        />
        <line
          className={tickClassName}
          style={tickStyle(6)}
          x1="8"
          x2="8"
          y1="10"
          y2="14"
        />
        <line
          className={tickClassName}
          style={tickStyle(-8)}
          x1="16"
          x2="16"
          y1="18"
          y2="22"
        />
      </svg>
    </div>
  );
});

SlidersHorizontalIcon.displayName = "SlidersHorizontalIcon";

export { SlidersHorizontalIcon };
