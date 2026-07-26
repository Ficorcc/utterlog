import { useEffect, useState } from 'react';
import { Loader2, MailSearch, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  EmptyState, LoadingState,
} from '@/components/ui/shadcn';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';

/**
 * 从历史评论里给友链匹配邮箱。
 *
 * 只做建议，勾选并确认后才写库 —— 域名匹配再准，把陌生人的邮箱写进友链表
 * 也是错的。邮箱存下来是拿去算 gravatar 的，等于决定了友链页显示谁的头像。
 */

type Suggestion = {
  linkId: number;
  linkName: string;
  linkUrl: string;
  currentEmail: string;
  suggestedEmail: string;
  commentCount: number;
  authorName: string;
  conflicting: string[];
};

export default function LinkEmailMatchDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (open: boolean) => void; onSaved?: () => void }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  /** 每行当前的邮箱输入值，键是 linkId。用户可以直接改。 */
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  /** 勾选要保存的行。默认只勾「原来是空的」—— 已经填过的不该被静默覆盖。 */
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api.get('/admin/link-emails')
      .then((res: any) => {
        if (cancelled) return;
        const list: Suggestion[] = res?.data?.suggestions || res?.suggestions || [];
        setSuggestions(list);
        setDrafts(Object.fromEntries(list.map((item) => [item.linkId, item.suggestedEmail])));
        setChecked(Object.fromEntries(list.map((item) => [item.linkId, !item.currentEmail])));
      })
      .catch(() => { if (!cancelled) toast.error(t('admin.links.emailMatchFailed', '匹配失败')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const selected = suggestions.filter((item) => checked[item.linkId]);

  const save = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      const res: any = await api.put('/admin/link-emails', {
        updates: selected.map((item) => ({ linkId: item.linkId, email: drafts[item.linkId] ?? '' })),
      });
      const saved = Number(res?.data?.saved ?? res?.saved ?? 0);
      toast.success(t('admin.links.emailMatchSaved', '已保存 {count} 条邮箱', { count: saved }));
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error(t('admin.links.emailMatchSaveFailed', '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-32px)] max-w-215 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.links.emailMatchTitle', '从评论匹配邮箱')}</DialogTitle>
        </DialogHeader>

        <p className="text-xs-plus text-muted-foreground">
          {t('admin.links.emailMatchHint',
            '按域名比对友链网址和评论者网址，取该域名下评论最多的邮箱。邮箱用于生成 Gravatar 头像，确认后才会保存。')}
        </p>

        {loading ? (
          <LoadingState />
        ) : suggestions.length === 0 ? (
          <EmptyState
            icon={<MailSearch />}
            title={t('admin.links.emailMatchEmpty', '没有匹配到邮箱')}
            description={t('admin.links.emailMatchEmptyHint', '友链站长还没有用相同域名的网址在站内评论过。')}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {suggestions.map((item) => {
              const isChecked = Boolean(checked[item.linkId]);
              return (
                <div
                  key={item.linkId}
                  className="grid items-center gap-3 bg-muted px-3 py-2"
                  style={{ gridTemplateColumns: '20px minmax(120px, 1fr) minmax(200px, 1.4fr)' }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [item.linkId]: e.target.checked }))}
                    className="size-4 accent-primary"
                    aria-label={t('admin.links.emailMatchSelect', '保存 {name} 的邮箱', { name: item.linkName })}
                  />

                  <div className="min-w-0">
                    <div className="truncate text-xs-plus font-medium">{item.linkName}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.linkUrl}</div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <Input
                      className="h-8 text-xs-plus"
                      value={drafts[item.linkId] ?? ''}
                      onChange={(e: any) => setDrafts((prev) => ({ ...prev, [item.linkId]: e.target.value }))}
                      disabled={!isChecked}
                      placeholder={t('admin.links.emailMatchPlaceholder', '留空则清除邮箱')}
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {t('admin.links.emailMatchSource', '来自「{author}」的 {count} 条评论', {
                          author: item.authorName || item.linkName,
                          count: item.commentCount,
                        })}
                      </span>
                      {item.currentEmail && item.currentEmail !== item.suggestedEmail && (
                        <span>{t('admin.links.emailMatchCurrent', '现有：{email}', { email: item.currentEmail })}</span>
                      )}
                      {item.conflicting.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <TriangleAlert className="size-3" />
                          {t('admin.links.emailMatchConflict', '同域名还有：{list}', {
                            list: item.conflicting.join('、'),
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('admin.common.cancel', '取消')}
          </Button>
          <Button onClick={save} disabled={saving || selected.length === 0}>
            {saving && <Loader2 className="animate-spin" />}
            {t('admin.links.emailMatchSave', '保存选中（{count}）', { count: selected.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
