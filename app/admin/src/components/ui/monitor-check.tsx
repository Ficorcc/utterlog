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

export interface MonitorCheckIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MonitorCheckIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants: 勾选路径 pathLength [0, 1] + opacity [0, 1]，0.4s easeInOut。
// CSS 版靠 pathLength="1" 把路径长度归一化，再用 stroke-dasharray:1 +
// icon-draw（globals.css 已有，chart-line 也在用）把 stroke-dashoffset 从 1 拉到 0。
const CHECK_ANIMATE_CLASS =
  "[stroke-dasharray:1] animate-[icon-draw_0.4s_ease-in-out] motion-reduce:animate-none";

const MonitorCheckIcon = forwardRef<
  MonitorCheckIconHandle,
  MonitorCheckIconProps
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
        <rect height="14" rx="2" width="20" x="2" y="3" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />
        <path
          className={animating ? CHECK_ANIMATE_CLASS : undefined}
          d="m9 10 2 2 4-4"
          pathLength={1}
        />
      </svg>
    </div>
  );
});

MonitorCheckIcon.displayName = "MonitorCheckIcon";

export { MonitorCheckIcon };
