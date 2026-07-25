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

export interface MapPinIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MapPinIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants:
//  - svg: y [0, -5, -3]，times [0, .6, 1]，hover 期间停在 -3 → icon-lift + forwards，
//    移出时靠常驻的 .icon-transform-snap 平滑落回原位。
//  - 圆点: opacity [0, 1] + pathLength [0, 1] + pathOffset [.5, 0]，delay 0.3。
//    描线部分是路径变形，CSS 做不到（<circle> 上的 pathLength 支持度也不稳），
//    降级成淡入 + 从一半大小放大 —— 复用 icon-draw-pop，但不加 stroke-dasharray，
//    没有虚线图案时其中的 stroke-dashoffset 不产生效果，只剩 opacity + scale。
const SVG_CLASS = "icon-transform-snap";
const SVG_ANIMATE_CLASS =
  "animate-[icon-lift_0.5s_ease-out_forwards] motion-reduce:animate-none";
const CIRCLE_ANIMATE_CLASS =
  "icon-origin-self animate-[icon-draw-pop_0.5s_ease-out_0.3s_both] motion-reduce:animate-none";

const MapPinIcon = forwardRef<MapPinIconHandle, MapPinIconProps>(
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
          className={cn(SVG_CLASS, animating && SVG_ANIMATE_CLASS)}
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
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle
            className={animating ? CIRCLE_ANIMATE_CLASS : undefined}
            cx="12"
            cy="10"
            r="3"
          />
        </svg>
      </div>
    );
  }
);

MapPinIcon.displayName = "MapPinIcon";

export { MapPinIcon };
