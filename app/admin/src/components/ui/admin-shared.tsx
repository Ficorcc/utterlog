import type { ReactNode } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button as ShadcnButton } from './shadcn/button';
import { RowActions } from './row-actions';
import { Card } from './shadcn/card';
import { EmptyState } from './shadcn/empty-state';
import { cn } from '@/lib/utils';

// Shared admin composites, now rendered with the shadcn design system.
// Public APIs are unchanged so every page keeps working.

interface AdminToolbarProps { meta?: ReactNode; actions?: ReactNode; }

export function AdminToolbar({ meta, actions }: AdminToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="mr-auto flex min-w-0 items-center gap-1">
        {typeof meta === 'string' ? <span className="text-sm text-muted-foreground">{meta}</span> : meta}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

interface MetricCardProps { label: ReactNode; value: ReactNode; color?: string; }

export function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={color ? { color } : undefined}>{value}</p>
    </Card>
  );
}

interface MetricGridProps { children: ReactNode; columns?: number; compact?: boolean; }

export function MetricGrid({ children, columns = 3, compact }: MetricGridProps) {
  return (
    <div
      className={cn('grid gap-3', compact ? 'mb-5' : 'mb-6')}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function LoadingState({ label = '加载中…' }: { label?: string; padding?: string | number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

interface EmptyPanelProps {
  title?: string;
  actionText?: string;
  onAction?: () => void;
  padding?: string | number;
  fontSize?: string | number;
}

/**
 * EmptyPanel 现在是 shadcn EmptyState 的适配层，只保留默认标题。
 *
 * 两者本来是同一件事的两份实现，差别只在 title 颜色（muted vs foreground）
 * 和按钮带不带 Plus 图标 —— 空状态在 20 处用 EmptyState、4 处用 EmptyPanel，
 * 长相却不一样。EmptyState 是超集（多 description / icon），所以留它。
 *
 * 新代码直接用 EmptyState。
 */
export function EmptyPanel({ title = '暂无内容', actionText, onAction }: EmptyPanelProps) {
  return <EmptyState title={title} actionText={actionText} onAction={onAction} />;
}


interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  gap?: number;
}

export function RatingStars({ value, onChange, size = 18, gap = 4 }: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex" style={{ gap }}>
      {stars.map((n) => {
        const filled = n <= value;
        const icon = (
          <Star
            style={{ width: size, height: size }}
            className={filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}
          />
        );
        if (!onChange) return <span key={n}>{icon}</span>;
        return (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} 星`} className="cursor-pointer p-0.5">
            {icon}
          </button>
        );
      })}
    </div>
  );
}

interface DialogActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitText?: string;
  cancelText?: string;
}

// 成品动作栏（取消 + 提交 + loading），跟 shadcn/dialog 里那个只管布局的
// DialogFooter 不是一回事 —— 之前两者同名，import 时得靠路径分辨。
export function DialogActions({ onCancel, onSubmit, submitting, submitText = '保存', cancelText = '取消' }: DialogActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <ShadcnButton variant="outline" onClick={onCancel}>{cancelText}</ShadcnButton>
      <ShadcnButton onClick={onSubmit} disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" />}{submitText}
      </ShadcnButton>
    </div>
  );
}

interface MediaItemCardProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  subtitle?: (item: any) => ReactNode;
  coverHeight?: number;
  /** 无封面时的占位内容；传了才会强制画出封面区（音乐、相册都要占位方块）。 */
  coverFallback?: ReactNode;
  /** 叠在封面右上角的角标，比如公开/私有。 */
  coverBadge?: (item: any) => ReactNode;
  /** 点封面进详情（相册点封面进照片管理）。 */
  onCoverClick?: (item: any) => void;
  /** 整卡压暗，用于草稿/隐藏态。 */
  dimmed?: (item: any) => boolean;
  /** 操作行左侧的说明文字，比如来源平台、照片张数。 */
  meta?: (item: any) => ReactNode;
  /** 排在编辑/删除前面的额外操作，比如显示/隐藏切换。 */
  extraActions?: (item: any) => ReactNode;
  /** 是否渲染 item.comment 的评价段（音乐、相册没有这个字段，传 false）。 */
  showComment?: boolean;
}

export function MediaItemCard({
  item, onEdit, onDelete, subtitle, coverHeight = 160,
  coverFallback, coverBadge, onCoverClick, dimmed, meta, extraActions,
  showComment = true,
}: MediaItemCardProps) {
  const showCover = !!item.cover_url || !!coverFallback;
  return (
    <Card className={cn('overflow-hidden p-0', dimmed?.(item) && 'opacity-50')}>
      {showCover && (
        <div
          className={cn(
            'relative flex w-full items-center justify-center overflow-hidden bg-muted',
            onCoverClick && 'cursor-pointer',
          )}
          style={{ height: coverHeight }}
          onClick={onCoverClick ? () => onCoverClick(item) : undefined}
        >
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="size-full object-cover" />
            : coverFallback}
          {coverBadge?.(item)}
        </div>
      )}
      <div className="p-3.5">
        {/* 标题和副标题都要 truncate：卡片宽度是 auto-fill 的，长标题不截断会把
            卡片撑变形（Music 的歌名、Albums 的相册描述原本各自都带 truncate）。 */}
        <h3 className="mb-1 truncate text-sm font-semibold text-foreground">{item.title}</h3>
        {subtitle ? <p className="mb-1.5 truncate text-xs text-muted-foreground">{subtitle(item)}</p> : null}
        {item.rating > 0 && <div className="mb-1.5"><RatingStars value={item.rating} size={12} gap={2} /></div>}
        {/* 评价只有影音/图书/好物这类有，音乐和相册的数据里没有这个字段；
            以前它们各写各的卡片，合并到这里后要能关掉，否则凭空多出一段文本。 */}
        {showComment && item.comment && <p className="line-clamp-2 text-xs text-muted-foreground">{item.comment}</p>}
        <div className="mt-2 flex items-center gap-2">
          {meta && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{meta(item)}</span>}
          <RowActions
            className={cn(!meta && 'flex-1')}
            extra={extraActions?.(item)}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item.id)}
          />
        </div>
      </div>
    </Card>
  );
}

interface MediaItemGridProps extends Omit<MediaItemCardProps, 'item'> {
  items: any[];
  minWidth?: number;
}

export function MediaItemGrid({ items, minWidth = 240, ...card }: MediaItemGridProps) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}>
      {items.map((item) => (
        <MediaItemCard key={item.id} item={item} {...card} />
      ))}
    </div>
  );
}
