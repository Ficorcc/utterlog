import { useEffect, useState, useCallback } from 'react';
import { momentCommentsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Trash2, Search, MessageCircle } from 'lucide-react';
import {
  Button, Input, Card, Pagination, ConfirmDialog,
  EmptyState, LoadingState,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/shadcn';
import { RowAction, RowActionGroup } from '@/components/ui/row-actions';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const defaultAvatar = 'https://gravatar.bluecdn.com/avatar/0?d=mp&s=64';

// 说说评论管理：数据在独立的 ul_moment_comments 表（与文章评论分离），
// 参照「全部评论」的列表形态实现 —— 搜索、分页、删除。
export default function MomentComments() {
  const { t } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await momentCommentsApi.list({ page, per_page: 20, search });
      const d = r.data || r;
      setRows(d.data || []);
      setTotalPages(Math.max(1, Number(d.meta?.total_pages) || 1));
      setTotal(Number(d.meta?.total) || 0);
    } catch {
      toast.error('获取说说评论失败');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await momentCommentsApi.delete(deleteId);
      toast.success('已删除');
      setDeleteId(null);
      fetchList();
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <>
      <Card className="overflow-x-auto md:overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="size-4 text-primary" />
            说说评论
            <span className="text-xs font-normal text-muted-foreground">共 {total} 条</span>
          </div>
          <div className="flex w-full max-w-72 items-center gap-2 md:w-auto">
            <Input
              value={searchInput}
              onChange={(e: any) => setSearchInput(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter') { setPage(1); setSearch(searchInput.trim()); }
              }}
              placeholder="搜索评论者 / 内容 / 邮箱"
              className="h-8"
            />
            <Button size="sm" variant="outline" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>
              <Search className="size-3.5" />
            </Button>
          </div>
        </div>

        <Table style={{ minWidth: 760 }}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">评论者</TableHead>
              <TableHead>评论内容</TableHead>
              <TableHead className="w-64">所属说说</TableHead>
              <TableHead className="w-36">时间</TableHead>
              <TableHead className="w-16 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="p-0"><LoadingState label={t('common.loading', '加载中…')} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="p-0"><EmptyState icon={<MessageCircle />} title="暂无说说评论" /></TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <img src={defaultAvatar} alt="" className="size-6 shrink-0 rounded-full" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs-plus font-medium">{row.author_name}</span>
                        {row.is_admin && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-primary px-1 py-px text-2xs font-semibold text-primary-foreground">
                            博主
                          </span>
                        )}
                      </div>
                      {row.author_email && <div className="truncate text-2xs text-muted-foreground">{row.author_email}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="line-clamp-2 max-w-md whitespace-pre-wrap text-xs-plus leading-relaxed">{row.content}</p>
                </TableCell>
                <TableCell>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{row.moment_content || '（说说已删除）'}</p>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                <TableCell>
                  <RowActionGroup>
                    <RowAction
                      icon={Trash2}
                      title={t('admin.common.delete', '删除')}
                      tone="danger"
                      onClick={() => setDeleteId(Number(row.id))}
                    />
                  </RowActionGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="border-t border-border px-4 py-3">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除说说评论"
        message="确定要删除这条评论吗？此操作不可撤销。"
      />
    </>
  );
}
