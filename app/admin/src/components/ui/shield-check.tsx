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

export interface ShieldCheckIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ShieldCheckIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants: 勾选路径 opacity [0, 1] + pathLength [0, 1] + scale [.5, 1]，
// 0.4s。CSS 版用 pathLength="1" + stroke-dasharray:1 还原描线，配合 icon-draw-pop
// 把描线、淡入、放大三件事放进同一条 keyframes；缩放中心用 .icon-origin-self
// （fill-box 中心），和 motion 绕自身包围盒中心缩放一致。
const CHECK_ANIMATE_CLASS =
  "icon-origin-self [stroke-dasharray:1] animate-[icon-draw-pop_0.4s_ease-out] motion-reduce:animate-none";

const ShieldCheckIcon = forwardRef<ShieldCheckIconHandle, ShieldCheckIconProps>(
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
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path
            className={animating ? CHECK_ANIMATE_CLASS : undefined}
            d="m9 12 2 2 4-4"
            pathLength={1}
          />
        </svg>
      </div>
    );
  }
);

ShieldCheckIcon.displayName = "ShieldCheckIcon";

export { ShieldCheckIcon };
