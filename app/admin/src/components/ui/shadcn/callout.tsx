import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 提示条 / 警告条。
 *
 * 之前站内 5 处各写一套「边框 + 底色 + 文字色」的配方，amber 有的用
 * /35 有的用 /50，dark: 色阶也各不相同。这里定死三档语气。
 *
 * 用 500/xx 透明度而不是 --color-warning 那组语义 token：那三个 token
 * 在 globals.css 里定义了但 TSX 侧零引用，且只有一个色值，配不出
 * 「边框深、底色浅」的层次，深色模式下也压不住。
 */
type CalloutTone = 'info' | 'warning' | 'danger';

const TONE: Record<CalloutTone, string> = {
  info: 'border-primary/30 bg-primary/8 text-muted-foreground',
  warning: 'border-amber-500/35 bg-amber-500/10 text-muted-foreground',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export function Callout({
  tone = 'info',
  icon,
  className,
  children,
}: {
  tone?: CalloutTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 border px-4 py-3 text-xs leading-relaxed',
        TONE[tone],
        className,
      )}
    >
      {icon && <span className="mt-px shrink-0 [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
