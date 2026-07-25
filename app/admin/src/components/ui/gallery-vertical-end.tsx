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

export interface GalleryVerticalEndIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface GalleryVerticalEndIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const GalleryVerticalEndIcon = forwardRef<
  GalleryVerticalEndIconHandle,
  GalleryVerticalEndIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => setIsAnimating(true),
      stopAnimation: () => setIsAnimating(false),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        setIsAnimating(true);
      }
    },
    [onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        setIsAnimating(false);
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
        className={cn(isAnimating && "icon-stack-run")}
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
        <path d="M7 2h10" />
        <path d="M5 6h14" />
        <rect height="12" rx="2" width="18" x="3" y="10" />
      </svg>
    </div>
  );
});

GalleryVerticalEndIcon.displayName = "GalleryVerticalEndIcon";

export { GalleryVerticalEndIcon };
