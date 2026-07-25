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

export interface PlayIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PlayIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 先回撤再向前顶一下，动效是 globals.css 里的 @keyframes icon-nudge。
const ANIMATION_CLASS = "icon-anim-nudge";

// 三角形 points="6 3 20 12 6 21" 的包围盒中心，
// 让旋转绕图形自身中心走（SVG 子元素默认绕 viewBox 原点转）。
const TRIANGLE_CENTER = { transformOrigin: "13px 12px" } as const;

const PlayIcon = forwardRef<PlayIconHandle, PlayIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const [animating, setAnimating] = useState(false);
    // 连续 hover 时 className 没变化，CSS 动画不会重放 ——
    // runId 每次 start 自增并当作 <polygon> 的 key，靠重挂载重放动画。
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
          <polygon
            className={animating ? ANIMATION_CLASS : undefined}
            key={runId}
            points="6 3 20 12 6 21 6 3"
            style={TRIANGLE_CENTER}
          />
        </svg>
      </div>
    );
  }
);

PlayIcon.displayName = "PlayIcon";

export { PlayIcon };
