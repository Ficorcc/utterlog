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

export interface LoaderIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LoaderIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 匀速无限自转，动效是 globals.css 里的 @keyframes icon-spin。
// 停止时直接回到 0 度（原来的 spring 回弹 CSS 端没有等价写法）。
const ANIMATION_CLASS = "icon-anim-spin";

const LoaderIcon = forwardRef<LoaderIconHandle, LoaderIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const [animating, setAnimating] = useState(false);
    // 连续 hover 时 className 没变化，CSS 动画不会重放 ——
    // runId 每次 start 自增并当作 <g> 的 key，靠重挂载重放动画。
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
          <g
            className={animating ? ANIMATION_CLASS : undefined}
            key={runId}
            style={{ transformOrigin: "12px 12px" }}
          >
            <path d="M12 2v4" />
            <path d="m16.2 7.8 2.9-2.9" />
            <path d="M18 12h4" />
            <path d="m16.2 16.2 2.9 2.9" />
            <path d="M12 18v4" />
            <path d="m4.9 19.1 2.9-2.9" />
            <path d="M2 12h4" />
            <path d="m4.9 4.9 2.9 2.9" />
          </g>
        </svg>
      </div>
    );
  }
);

LoaderIcon.displayName = "LoaderIcon";

export { LoaderIcon };
