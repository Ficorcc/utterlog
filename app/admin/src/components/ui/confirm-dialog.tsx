import { ConfirmDialog as ShadcnConfirmDialog } from './shadcn/confirm-dialog';

/**
 * 老式 ConfirmDialog 的 props 适配层：isOpen/onClose → open/onOpenChange。
 *
 * 这个文件原先自己画了一套 UI（居中 + 红底警告图标 + secondary 取消），
 * 和 shadcn/confirm-dialog 那套（左对齐 + DialogFooter + outline 取消）
 * 并存，同一个「确认删除」在不同页面两种长相。现在只做 props 转换，UI 全部
 * 走 shadcn 那份，十几个用老 API 的页面不用改一行。
 *
 * 新代码直接从 '@/components/ui/shadcn' 引 ConfirmDialog，别再用这个。
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmText, cancelText, loading,
}: ConfirmDialogProps) {
  return (
    <ShadcnConfirmDialog
      open={isOpen}
      onOpenChange={(next) => { if (!next) onClose(); }}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      loading={loading}
    />
  );
}
