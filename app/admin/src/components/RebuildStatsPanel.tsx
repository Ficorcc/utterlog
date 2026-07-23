import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/shadcn';
import { cn } from '@/lib/utils';

// Post-sync / post-restore utility. Recomputes denormalized counters
// Utterlog caches on content rows: ul_metas.count, ul_posts.comment_count,
// ul_posts.word_count. Safe to run repeatedly — no-op on already
// consistent data.
export default function RebuildStatsPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    meta_count_updated?: number;
    comment_count_updated?: number;
    word_count_updated?: number;
  } | null>(null);
  const [err, setErr] = useState<string>('');

  const run = async () => {
    setBusy(true);
    setErr('');
    setResult(null);
    try {
      const r = await api.post<any>('/admin/system/rebuild-stats');
      setResult(r.data?.data || r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message || e?.message || '请求失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card mt-5 py-4 px-4.5">
      <div className="mb-1.5" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <RefreshCw className="size-4 text-primary" />
        <div className="text-sm font-semibold text-foreground">重建统计信息</div>
      </div>
      <p className="text-xs text-muted-foreground mb-3" style={{ lineHeight: 1.7 }}>
        从评论、关系表实时重算每篇文章的评论数、每个分类/标签的引用数、每篇文章的字数。
        WordPress 导入后、手动导入、或发现数字与实际对不上时，点一下。
      </p>
      <Button size="sm" onClick={run} disabled={busy}>
        <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
        {busy ? '重建中…' : '立即重建'}
      </Button>
      {result && (
        <div className="text-xs text-muted-foreground mt-3" style={{ lineHeight: 1.7 }}>
          <div>分类/标签数量：更新 {result.meta_count_updated ?? 0} 行</div>
          <div>文章评论数：更新 {result.comment_count_updated ?? 0} 行</div>
          <div>文章字数：更新 {result.word_count_updated ?? 0} 行</div>
        </div>
      )}
      {err && (
        <div className="text-xs text-destructive mt-3">{err}</div>
      )}
    </div>
  );
}
