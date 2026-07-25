"use client";

import type React from "react";
import type { HTMLAttributes } from "react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

export interface FileTextIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FileTextIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// 原 motion variants:
//  - svg: scale 1 → 1.05，0.3s easeOut，hover 期间一直保持 → 用 transition 实现，
//    移出时同一条 transition 平滑回落（.icon-transform-snap 是已有的共用类）。
//  - 三条正文线: pathLength [1, 0, 1]，duration 0.7，delay 依次 0.3 / 0.5 / 0.7
//    → pathLength="1" 把长度归一化，stroke-dasharray:1 + icon-redraw 把
//    stroke-dashoffset 拉到 1 再拉回 0，等价于"擦掉再写回"。
const SVG_CLASS = "icon-transform-snap";
const LINE_1_ANIMATE =
  "[stroke-dasharray:1] animate-[icon-redraw_0.7s_ease-in-out_0.3s_both] motion-reduce:animate-none";
const LINE_2_ANIMATE =
  "[stroke-dasharray:1] animate-[icon-redraw_0.7s_ease-in-out_0.5s_both] motion-reduce:animate-none";
const LINE_3_ANIMATE =
  "[stroke-dasharray:1] animate-[icon-redraw_0.7s_ease-in-out_0.7s_both] motion-reduce:animate-none";

const FILE_TEXT = forwardRef<FileTextIconHandle, FileTextIconProps>(
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
          className={cn(SVG_CLASS, animating && "icon-scale-up")}
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
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />

          <path
            className={animating ? LINE_1_ANIMATE : undefined}
            d="M10 9H8"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            className={animating ? LINE_2_ANIMATE : undefined}
            d="M16 13H8"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            className={animating ? LINE_3_ANIMATE : undefined}
            d="M16 17H8"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  }
);

FILE_TEXT.displayName = "FileTextIcon";

export { FILE_TEXT as FileTextIcon };
