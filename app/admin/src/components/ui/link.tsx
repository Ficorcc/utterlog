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

export interface LinkIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LinkIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants: pathLength [1, .97, 1, .97, 1] + pathOffset [0, .05, …]
// 的"链子被拽了两下"，叠加 rotate [0, -5, 0]。pathLength/pathOffset 分别等价于
// stroke-dasharray/stroke-dashoffset，都能直接用 CSS 动画还原，三者合成
// icon-chain-tug；两段链子各绕自身包围盒中心回摆（.icon-origin-self）。
const PATH_ANIMATE_CLASS =
  "icon-origin-self animate-[icon-chain-tug_0.6s_ease-in-out] motion-reduce:animate-none";

const LinkIcon = forwardRef<LinkIconHandle, LinkIconProps>(
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
          <path
            className={animating ? PATH_ANIMATE_CLASS : undefined}
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
            pathLength="1"
          />
          <path
            className={animating ? PATH_ANIMATE_CLASS : undefined}
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
            pathLength="1"
          />
        </svg>
      </div>
    );
  }
);

LinkIcon.displayName = "LinkIcon";

export { LinkIcon };
