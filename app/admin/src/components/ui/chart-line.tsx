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

export interface ChartLineIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChartLineIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants: pathLength [0, 1] + opacity [0, 1]，delay 0.15、duration 0.3。
// CSS 版靠 path 上的 pathLength="1" 把路径长度归一化，再用 stroke-dasharray:1 +
// icon-draw（globals.css）把 stroke-dashoffset 从 1 拉到 0，等价于描线动画。
// backwards 让 delay 期间保持起始帧（不可见），和 motion 的延迟表现一致。
const ANIMATE_CLASS =
  "[stroke-dasharray:1] animate-[icon-draw_0.3s_ease-out_0.15s_backwards] motion-reduce:animate-none";

const ChartLineIcon = forwardRef<ChartLineIconHandle, ChartLineIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path
            className={animating ? ANIMATE_CLASS : undefined}
            d="m7 13 3-3 4 4 5-5"
            pathLength={1}
          />
        </svg>
      </div>
    );
  }
);

ChartLineIcon.displayName = "ChartLineIcon";

export { ChartLineIcon };
