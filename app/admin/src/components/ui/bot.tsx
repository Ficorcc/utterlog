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

export interface BotIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BotIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 眨眼：原来动的是两条 <line> 的 y1/y2 端点，CSS 动不了 SVG 几何属性，
// 降级成绕眼睛中心的 scaleY 压扁（globals.css 的 icon-blink / .icon-anim-blink）。
const BotIcon = forwardRef<BotIconHandle, BotIconProps>(
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

    const eyeClassName = animating ? "icon-anim-blink" : undefined;

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
          <path d="M12 8V4H8" />
          <rect height="12" rx="2" width="16" x="4" y="8" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />

          <line
            className={eyeClassName}
            style={{ transformOrigin: "15px 14px" }}
            x1={15}
            x2={15}
            y1={13}
            y2={15}
          />

          <line
            className={eyeClassName}
            style={{ transformOrigin: "9px 14px" }}
            x1={9}
            x2={9}
            y1={13}
            y2={15}
          />
        </svg>
      </div>
    );
  }
);

BotIcon.displayName = "Bot";

export { BotIcon };
