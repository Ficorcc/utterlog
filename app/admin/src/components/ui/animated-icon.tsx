import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type {
  ForwardRefExoticComponent,
  HTMLAttributes,
  ReactNode,
  RefAttributes,
} from 'react';

import { cn } from '@/lib/utils';

/** 动画图标暴露给父级的命令式接口，components/ui 下每个图标都实现它。 */
export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export type AnimatedIconProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

export type AnimatedIcon = ForwardRefExoticComponent<
  AnimatedIconProps & RefAttributes<AnimatedIconHandle>
>;

/**
 * 由父级的 hover 状态驱动图标动画。
 *
 * 图标自己也能处理 hover（不传 ref 时鼠标移到图标上就播），但导航项的热区
 * 是整行/整个 tab，鼠标通常不落在那 16px 图标上，所以这里用受控模式：父级
 * 把 hover 状态算出来，通过 ref 命令式地开关动画。CSS 的 group-hover 驱动
 * 不了 React state，这层包装省不掉。
 */
export function AnimatedIcon({
  icon: Icon,
  hovered,
  size,
  className,
}: {
  icon: AnimatedIcon;
  hovered: boolean;
  size: number;
  className?: string;
}) {
  const iconRef = useRef<AnimatedIconHandle>(null);

  useEffect(() => {
    if (hovered) {
      iconRef.current?.startAnimation();
    } else {
      iconRef.current?.stopAnimation();
    }
  }, [hovered]);

  return <Icon ref={iconRef} aria-hidden size={size} className={className} />;
}

/**
 * 造一个动画图标：外壳（受控/非受控 hover、lucide 的 24 栅格 svg 规格）都一样，
 * 各图标只差 renderPaths 里那几条路径和挂在上面的 motion-* 动效类。
 *
 * 先前那 30 个图标是从 lucide-animated 一个个抄过来的完整 forwardRef，没有动
 * 它们；新图标走这个工厂，省掉每份 60 行同样的样板。
 */
export function createAnimatedIcon(
  displayName: string,
  renderPaths: (animating: boolean) => ReactNode
): AnimatedIcon {
  const Icon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
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
            {renderPaths(animating)}
          </svg>
        </div>
      );
    }
  );

  Icon.displayName = displayName;

  return Icon;
}
