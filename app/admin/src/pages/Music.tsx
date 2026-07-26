
import { useEffect, useMemo, useState } from 'react';
import { musicApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import { Search, Link2, Plus, Music as MusicIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  EmptyState,
  Input,
  Label,
  LoadingState,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Textarea,
} from '@/components/ui/shadcn';
import { AdminToolbar, CoverInput, DialogActions, MediaItemGrid, RatingStars } from '@/components/ui';
import { RowAction } from '@/components/ui/row-actions';
import { ImportUrlModal } from '@/components/ui/import-url-modal';

function musicProxy(platform: string, id: string, asset: 'cover' | 'stream') {
  return `/api/v1/music/proxy/${encodeURIComponent(platform)}/songs/${encodeURIComponent(id)}/${asset}`;
}

export default function MusicPage() {
  const { t } = useI18n();
  const platformLabels = useMemo<Record<string, string>>(() => ({
    netease: t('admin.music.platform.neteaseShort', '网易云'),
    tencent: 'QQ',
    kugou: t('admin.music.platform.kugouShort', '酷狗'),
    kuwo: t('admin.music.platform.kuwoShort', '酷我'),
    baidu: t('admin.music.platform.baidu', '百度'),
    local: t('admin.common.local', '本地'),
  }), [t]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try { const r: any = await musicApi.list(); setItems(r.data || []); }
    catch { toast.error('获取失败'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditingId(null); setForm({ title: '', cover_url: '', rating: 0, comment: '', status: 'publish' }); setIsModalOpen(true); };
  const openEdit = (item: any) => { setEditingId(item.id); setForm({ ...item }); setIsModalOpen(true); };

  const onSubmit = async () => {
    if (!form.title?.trim()) { toast.error(t('admin.music.titleRequired', '标题不能为空')); return; }
    setSubmitting(true);
    try {
      if (editingId) { await musicApi.update(editingId, form); toast.success(t('admin.common.updateSuccess', '更新成功')); }
      else { await musicApi.create(form); toast.success(t('admin.common.addSuccess', '添加成功')); }
      setIsModalOpen(false); fetchData();
    } catch { toast.error(t('admin.common.operationFailed', '操作失败')); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await musicApi.delete(deleteId); toast.success(t('admin.common.deleteSuccess', '删除成功')); fetchData(); }
    catch { toast.error(t('admin.common.deleteFailed', '删除失败')); }
    finally { setDeleteId(null); }
  };

  const toggleVisibility = async (item: any) => {
    const newStatus = item.status === 'publish' ? 'draft' : 'publish';
    try {
      await musicApi.update(item.id, { ...item, status: newStatus });
      toast.success(newStatus === 'publish' ? t('admin.common.shown', '已显示') : t('admin.common.hidden', '已隐藏'));
      fetchData();
    } catch { toast.error(t('admin.common.operationFailed', '操作失败')); }
  };

  // Search music through the Bun app proxy.
  const [searchPlatform, setSearchPlatform] = useState('netease');
  const doSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    setSearchResults([]);
    const kw = encodeURIComponent(keyword);
    try {
      const resp = await fetch(`/api/v1/music/search?platform=${encodeURIComponent(searchPlatform)}&q=${kw}&page=1&limit=20`);
      const json = await resp.json();
      const data = json.data || json;
      const items = data.items || data.songs || [];
      setSearchResults(items.map((d: any) => ({
        ...d,
        _src: {
          netease: t('admin.music.platform.neteaseShort', '网易云'),
          kugou: t('admin.music.platform.kugouShort', '酷狗'),
          kuwo: t('admin.music.platform.kuwoShort', '酷我'),
          tencent: t('admin.music.platform.tencent', 'QQ音乐'),
        }[searchPlatform] || searchPlatform,
        _platform: searchPlatform,
      })));
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const addFromSearch = async (item: any) => {
    const key = item.id;
    setAdding(key);
    try {
      await musicApi.create({
        title: item.name || item.title,
        artist: item.artist || (item.artists || []).join(', '),
        album: item.album || '',
        platform: item._platform || 'netease',
        platform_id: String(item.id),
        cover_url: musicProxy(item._platform || 'netease', String(item.id), 'cover'),
        play_url: musicProxy(item._platform || 'netease', String(item.id), 'stream'),
        status: 'publish',
      });
      toast.success(`已添加：${item.name || item.title}`);
      fetchData();
    } catch { toast.error(t('admin.common.addFailed', '添加失败')); }
    setAdding(null);
  };

  return (
    <div>
      <AdminToolbar
        meta={`${items.length} 首歌曲`}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowSearch(!showSearch)}>
              <Search />{showSearch ? t('admin.music.closeSearch', '关闭搜索') : t('admin.music.searchAdd', '搜索添加')}
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Link2 /> {t('admin.music.linkImport', '链接导入')}
            </Button>
            <Button onClick={openCreate}><Plus />{t('admin.music.manualAdd', '手动添加')}</Button>
          </>
        }
      />

      {/* Search panel */}
      {showSearch && (
        <Card className="mb-4 p-4">
          <div className="mb-3 flex gap-2">
            <Select value={searchPlatform} onValueChange={(v) => setSearchPlatform((v as string) || 'netease')}>
              <SelectTrigger className="w-25 shrink-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="netease">{t('admin.music.platform.neteaseShort', '网易云')}</SelectItem>
                <SelectItem value="tencent">{t('admin.music.platform.tencent', 'QQ音乐')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="搜索歌曲名或歌手…"
                className="pl-8"
              />
            </div>
            <Button size="icon" title="搜索" onClick={doSearch} disabled={searching}>
              {searching ? <Loader2 className="animate-spin" /> : <Search />}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-75 overflow-auto">
              {searchResults.slice(0, 20).map((r: any, i: number) => {
                const key = String(r.id);
                const exists = items.some((it: any) => it.platform_id === key);
                return (
                  <div key={i} className="flex items-center gap-2.5 border-b border-border p-2">
                    {r.cover && (
                      <img src={r.cover} alt="" className="size-9 shrink-0 object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs-plus font-medium text-foreground">{r.name || r.title}</p>
                      <p className="mt-0.5 text-2xs text-muted-foreground">
                        {r.artist || (r.artists || []).join(', ')}
                        {r.album && <span> · {r.album}</span>}
                        <span className="ml-1.5 rounded-sm bg-muted px-1 text-3xs">{r._src}</span>
                      </p>
                    </div>
                    {exists ? (
                      <span className="text-xs text-muted-foreground">{t('admin.common.added', '已添加')}</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => addFromSearch(r)} disabled={adding === key}>
                        {adding === key ? <Loader2 className="animate-spin" /> : <Plus />}{t('admin.common.add', '添加')}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {searchResults.length === 0 && keyword && !searching && (
            <EmptyState title="无搜索结果" className="py-8" />
          )}
        </Card>
      )}

      {/* Music list */}
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState title="暂无内容" actionText={t('admin.music.searchAdd', '搜索添加')} onAction={() => setShowSearch(true)} />
      ) : (
        <MediaItemGrid
          showComment={false}
          items={items}
          onEdit={openEdit}
          onDelete={setDeleteId}
          minWidth={200}
          coverHeight={200}
          coverFallback={<MusicIcon className="size-8 text-muted-foreground" />}
          dimmed={(item) => item.status === 'draft'}
          subtitle={(item) => item.artist || ''}
          meta={(item) => platformLabels[item.platform as string] || item.platform || t('admin.common.local', '本地')}
          extraActions={(item) => (
            <RowAction
              icon={item.status === 'publish' ? Eye : EyeOff}
              tone="warning"
              active={item.status !== 'publish'}
              title={item.status === 'publish' ? t('admin.common.hide', '隐藏') : t('admin.common.show', '显示')}
              onClick={() => toggleVisibility(item)}
            />
          )}
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={(o) => !o && setIsModalOpen(false)}>
        <DialogContent className="max-h-[calc(100vh-32px)] max-w-130 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t('admin.common.edit', '编辑') : t('admin.music.addMusic', '添加音乐')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.title', '标题')}</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.music.artist', '艺术家')}</Label>
              <Input value={form.artist || ''} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.music.album', '专辑')}</Label>
              <Input value={form.album || ''} onChange={(e) => setForm({ ...form, album: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.music.sourcePlatform', '来源平台')}</Label>
              <Select value={form.platform || 'netease'} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="netease">{t('admin.music.platform.netease', '网易云音乐')}</SelectItem>
                  <SelectItem value="tencent">{t('admin.music.platform.tencent', 'QQ音乐')}</SelectItem>
                  <SelectItem value="kugou">{t('admin.music.platform.kugou', '酷狗音乐')}</SelectItem>
                  <SelectItem value="kuwo">{t('admin.music.platform.kuwo', '酷我音乐')}</SelectItem>
                  <SelectItem value="local">{t('admin.common.local', '本地')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.music.platformSongId', '平台歌曲 ID')}</Label>
              <Input value={form.platform_id || ''} onChange={(e) => setForm({ ...form, platform_id: e.target.value })} placeholder="可选，用于获取歌词和封面" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.music.playUrl', '播放链接')}</Label>
              <Input value={form.play_url || ''} onChange={(e) => setForm({ ...form, play_url: e.target.value })} placeholder="直接音频链接（可选）" />
            </div>
            <CoverInput label="封面图片" value={form.cover_url || ''} onChange={(url) => setForm({ ...form, cover_url: url })} folder="music" />
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.status', '状态')}</Label>
              <Select value={form.status || 'publish'} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publish">{t('admin.common.show', '显示')}</SelectItem>
                  <SelectItem value="draft">{t('admin.common.hide', '隐藏')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.rating', '评分')}</Label>
              <RatingStars value={form.rating || 0} onChange={(v) => setForm({ ...form, rating: v })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.review', '评价')}</Label>
              <Textarea rows={3} value={form.comment || ''} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </div>
            <DialogActions
              onCancel={() => setIsModalOpen(false)}
              onSubmit={onSubmit}
              submitting={submitting}
              submitText={editingId ? t('admin.common.save', '保存') : t('admin.common.add', '添加')}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDelete} title="确认删除" message="删除后无法恢复" />

      <ImportUrlModal isOpen={showImport} onClose={() => setShowImport(false)} type="music" onImport={(data) => {
        setForm({
          title: data.title || '', artist: data.artist || '', album: data.album || '',
          cover_url: data.cover_url || '', rating: Math.round(data.rating || 0),
          platform: data.platform || '', platform_id: '', play_url: data.url || '',
          comment: data.summary || '', status: 'publish',
        });
        setEditingId(null);
        setIsModalOpen(true);
      }} />
    </div>
  );
}
