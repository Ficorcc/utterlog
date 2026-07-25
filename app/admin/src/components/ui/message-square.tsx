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

export interface MessageSquareIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MessageSquareIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 左右摇一下并停在放大状态，动效是 globals.css 里的 @keyframes icon-wiggle。
// .icon-anim-settle 常驻，负责撤销 hover 时把 scale 平滑收回去。
const IDLE_CLASS = "icon-anim-settle";
const ANIMATION_CLASS = "icon-anim-settle icon-anim-wiggle";

const MessageSquareIcon = forwardRef<
  MessageSquareIconHandle,
  MessageSquareIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
        className={animating ? ANIMATION_CLASS : IDLE_CLASS}
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  );
});

MessageSquareIcon.displayName = "MessageSquareIcon";

export { MessageSquareIcon };
