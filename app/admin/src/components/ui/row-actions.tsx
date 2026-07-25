import type { MouseEvent, ReactNode } from 'react';
import {
  ArrowDown, ArrowUp, Ban, Check, ExternalLink, Eye, EyeOff, Loader2,
  Pencil, Star, Trash2, type LucideIcon,
} from 'lucide-react';
import { Button } from './shadcn/button';
import { cn } from '@/lib/utils';

/**
 * 表格行的操作按钮。
 *
 * 站内有 130 个行内图标按钮、35 种图标，但组合高度集中：「编辑 + 删除」独占
 * 8 处，其余基本是它的扩展（加预览、加置顶、加审核）。之前每处各写一遍
 * variant / size / 颜色 / hover 类，同一个「删除」在不同页面的红色深浅都不一样。
 *
 * 这里按语义收口：调用方只说这是什么操作（edit / delete / approve …），
 * 颜色和 hover 由组件定。想加新语义就往 TONES 里加一档，别在调用点写 className。
 */
export type RowActionTone =
  | 'default'    // 中性：编辑、查看、外链
  | 'danger'     // 删除、封禁 —— 不可逆或破坏性
  | 'success'    // 通过、发布
  | 'warning'    // 精选、置顶 —— 状态标记
  | 'muted';     // 次要：上移下移这类排序

/**
 * 平时一律灰色，只有 hover 才显露语义色 —— 一行里并排四五个按钮，如果每个
 * 都常驻彩色，整张表会花得看不清内容。危险操作也不例外：它靠 hover 变红 +
 * title 提示来传达，而不是靠常驻的红色抢注意力。
 */
const TONES: Record<RowActionTone, string> = {
  default: 'text-muted-foreground hover:text-foreground hover:bg-accent',
  danger: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
  success: 'text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10',
  warning: 'text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10',
  muted: 'text-muted-foreground/70 hover:text-foreground hover:bg-accent',
};

export interface RowActionProps {
  icon: LucideIcon;
  title: string;
  /** 带上 event：卡片本身可点击时，按钮要 stopPropagation 才不会连带触发卡片。 */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  tone?: RowActionTone;
  /** 已激活的状态（比如已精选、已置顶）：常驻显示语义色，不用 hover 才看得见。 */
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'xs';
}

const ACTIVE_TONES: Record<RowActionTone, string> = {
  default: 'text-foreground',
  danger: 'text-destructive',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  muted: 'text-foreground',
};

export function RowAction({
  icon: Icon, title, onClick, tone = 'default', active, disabled, loading, size = 'sm',
}: RowActionProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size === 'xs' ? 'icon-xs' : 'icon-sm'}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn('transition-colors', active ? ACTIVE_TONES[tone] : TONES[tone])}
    >
      {loading ? <Loader2 className="animate-spin" /> : <Icon />}
    </Button>
  );
}

/** 一行操作按钮的容器，右对齐、间距统一。 */
export function RowActionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-end gap-0.5', className)}>{children}</div>;
}

/**
 * 最常见的那一组：编辑 + 删除。站内 8 处表格是这个组合，直接给个现成的，
 * 省得每次都拼两个 RowAction。需要更多操作时用 extra 往前面塞。
 */
export function RowActions({
  onEdit, onDelete, editTitle = '编辑', deleteTitle = '删除', extra, className,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editTitle?: string;
  deleteTitle?: string;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <RowActionGroup className={className}>
      {extra}
      {onEdit && <RowAction icon={Pencil} title={editTitle} onClick={onEdit} />}
      {onDelete && <RowAction icon={Trash2} title={deleteTitle} onClick={onDelete} tone="danger" />}
    </RowActionGroup>
  );
}

/** 站内实际出现过的几种操作的现成配置，免得每处自己挑图标和色调。 */
export const rowActionPresets = {
  edit: { icon: Pencil, tone: 'default' as const },
  delete: { icon: Trash2, tone: 'danger' as const },
  approve: { icon: Check, tone: 'success' as const },
  reject: { icon: Ban, tone: 'danger' as const },
  feature: { icon: Star, tone: 'warning' as const },
  show: { icon: Eye, tone: 'default' as const },
  hide: { icon: EyeOff, tone: 'muted' as const },
  open: { icon: ExternalLink, tone: 'default' as const },
  moveUp: { icon: ArrowUp, tone: 'muted' as const },
  moveDown: { icon: ArrowDown, tone: 'muted' as const },
};
