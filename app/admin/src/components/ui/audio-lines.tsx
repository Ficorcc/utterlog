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

export interface AudioLinesIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AudioLinesIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants: 4 根竖条各自在两组 d 之间来回插值（M6 6v11 ⇄ M6 10v3 …），
// 无限循环，周期分别是 1.5s / 1s / 0.8s / 1.5s。CSS 改不了 d，降级成绕 viewBox
// 中心的 scaleY 脉冲 —— 每组 d 的中点都在 y≈12，缩放中心和原动效基本重合。
// --icon-bar-scale = 目标高度 / 原高度：
//   M6  11 → 3  = 0.27      M10 18 → 5  = 0.28
//   M14 7  → 11 = 1.57      M18 13 → 9  = 0.69
const BAR_CLASS = "icon-origin-viewbox";
const BAR_1_ANIMATE =
  "[--icon-bar-scale:0.27] animate-[icon-bar-pulse_1.5s_ease-in-out_infinite] motion-reduce:animate-none";
const BAR_2_ANIMATE =
  "[--icon-bar-scale:0.28] animate-[icon-bar-pulse_1s_ease-in-out_infinite] motion-reduce:animate-none";
const BAR_3_ANIMATE =
  "[--icon-bar-scale:1.57] animate-[icon-bar-pulse_0.8s_ease-in-out_infinite] motion-reduce:animate-none";
const BAR_4_ANIMATE =
  "[--icon-bar-scale:0.69] animate-[icon-bar-pulse_1.5s_ease-in-out_infinite] motion-reduce:animate-none";

const AudioLinesIcon = forwardRef<AudioLinesIconHandle, AudioLinesIconProps>(
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
          <path d="M2 10v3" />
          <path
            className={cn(BAR_CLASS, animating && BAR_1_ANIMATE)}
            d="M6 6v11"
          />
          <path
            className={cn(BAR_CLASS, animating && BAR_2_ANIMATE)}
            d="M10 3v18"
          />
          <path
            className={cn(BAR_CLASS, animating && BAR_3_ANIMATE)}
            d="M14 8v7"
          />
          <path
            className={cn(BAR_CLASS, animating && BAR_4_ANIMATE)}
            d="M18 5v13"
          />
          <path d="M22 10v3" />
        </svg>
      </div>
    );
  }
);

AudioLinesIcon.displayName = "AudioLinesIcon";

export { AudioLinesIcon };
