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

export interface HouseIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface HouseIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 轻微上弹一下再落回，配合「回到首页」的动作语义。
// 动效本身是 globals.css 里的 @keyframes icon-bounce（多个图标共用）。
const ANIMATION_CLASS = "icon-anim-bounce";

const HouseIcon = forwardRef<HouseIconHandle, HouseIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const [animating, setAnimating] = useState(false);
    // 连续 hover 时 className 没变化，CSS 动画不会重放 ——
    // runId 每次 start 自增并当作 <svg> 的 key，靠重挂载重放动画。
    const [runId, setRunId] = useState(0);
    const isControlledRef = useRef(false);

    const startAnimation = useCallback(() => {
      setAnimating(true);
      setRunId((n) => n + 1);
    }, []);

    const stopAnimation = useCallback(() => {
      setAnimating(false);
    }, []);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return { startAnimation, stopAnimation };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          startAnimation();
        }
      },
      [startAnimation, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          stopAnimation();
        }
      },
      [stopAnimation, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          className={animating ? ANIMATION_CLASS : undefined}
          fill="none"
          height={size}
          key={runId}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      </div>
    );
  }
);

HouseIcon.displayName = "HouseIcon";

export { HouseIcon };
