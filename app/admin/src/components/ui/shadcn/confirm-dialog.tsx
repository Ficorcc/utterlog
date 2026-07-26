import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './dialog';
import { Button } from './button';
import { useI18n } from '@/lib/i18n';

/**
 * 全站唯一的确认弹窗实现。
 *
 * 曾经有两套：这一套，以及 components/ui/confirm-dialog.tsx 里自己画的一套
 * （居中 + 红底警告图标 + secondary 取消）。同一个「确认删除」在不同页面长得
 * 完全不一样。现在那个文件退化成纯 props 适配层（isOpen/onClose → open/
 * onOpenChange），只剩这里一份 UI。loading 是从它那边并过来的能力。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  destructive = true,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" showClose={false}>
        <DialogHeader>
          <DialogTitle>{title || t('admin.common.confirmAction', '确认操作')}</DialogTitle>
          {message && <DialogDescription>{message}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            {cancelText || t('admin.common.cancel', '取消')}
          </Button>
          {/* shadcn Button 没有 loading prop —— 转圈图标自己渲染，跟 SaveButton 一个写法 */}
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={() => { onConfirm(); onOpenChange(false); }}
          >
            {loading && <Loader2 className="animate-spin" />}
            {confirmText || t('admin.common.confirm', '确认')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
