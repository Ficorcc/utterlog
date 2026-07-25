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

export interface ClapIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ClapIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants: rotate [-10, -10, 0]，duration 0.8、times [0, 0.5, 1]，
// 支点 originX 4px / originY 20px（底座左下角）。
const BASE_ANIMATE_CLASS =
  "animate-[icon-clap-base_0.8s_ease-in-out] motion-reduce:animate-none";
// 原 motion variants: rotate [0, -10, 16, 0]，duration 0.4、times [0, 0.3, 0.6, 1]，
// 支点 originX 3px / originY 11px（上盖左端）。
const HAND_ANIMATE_CLASS =
  "animate-[icon-clap-hand_0.4s_ease-in-out] motion-reduce:animate-none";

// transform-box: fill-box —— 支点相对元素自身包围盒的左上角量起，这正是原来
// motion 的语义（它对 SVG 子元素强制写 transformBox: "fill-box"），所以 4px/20px
// 这些数值可以原样照搬。
// 换成 view-box 的话同样的数值会落在 viewBox 原点上，支点偏移约 2 个用户单位。
const BASE_ORIGIN_CLASS = "[transform-box:fill-box] [transform-origin:4px_20px]";
const HAND_ORIGIN_CLASS = "[transform-box:fill-box] [transform-origin:3px_11px]";

const ClapIcon = forwardRef<ClapIconHandle, ClapIconProps>(
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
          style={{ overflow: "visible" }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            className={cn(
              BASE_ORIGIN_CLASS,
              animating && BASE_ANIMATE_CLASS
            )}
          >
            <g
              className={cn(
                HAND_ORIGIN_CLASS,
                animating && HAND_ANIMATE_CLASS
              )}
            >
              <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
              <path d="m6.2 5.3 3.1 3.9" />
              <path d="m12.4 3.4 3.1 4" />
            </g>
            <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          </g>
        </svg>
      </div>
    );
  }
);

ClapIcon.displayName = "ClapIcon";

export { ClapIcon };
