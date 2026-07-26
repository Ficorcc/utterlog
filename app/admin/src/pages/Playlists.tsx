
import { useEffect, useState } from 'react';
import { playlistsApi, musicApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  EmptyState,
  Input,
  Label,
  LoadingState,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Textarea,
} from '@/components/ui/shadcn';
import { RowAction, RowActionGroup } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { AdminToolbar, DialogActions } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export default function PlaylistsPage() {
  const { t } = useI18n();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', description: '', cover_url: '', is_default: false });
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState({ server: 'netease', playlist_id: '', title: '' });
  const [importing, setImporting] = useState(false);

  // Songs management
  const [activePlaylist, setActivePlaylist] = useState<any | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
  const [allMusic, setAllMusic] = useState<any[]>([]);
  const [showAddSong, setShowAddSong] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => { fetchPlaylists(); }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try { const r: any = await playlistsApi.list(); setPlaylists(r.data || []); }
    catch { toast.error('获取歌单失败'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditingId(null); setForm({ title: '', description: '', cover_url: '', is_default: false }); setShowModal(true); };
  const openEdit = (p: any) => { setEditingId(p.id); setForm({ title: p.title, description: p.description || '', cover_url: p.cover_url || '', is_default: p.is_default }); setShowModal(true); };

  const onSubmit = async () => {
    if (!form.title.trim()) { toast.error(t('admin.playlists.nameRequired', '歌单名称不能为空')); return; }
    setSubmitting(true);
    try {
      if (editingId) { await playlistsApi.update(editingId, form); toast.success(t('admin.common.updateSuccess', '更新成功')); }
      else { await playlistsApi.create(form); toast.success(t('admin.common.createSuccess', '创建成功')); }
      setShowModal(false); fetchPlaylists();
    } catch { toast.error(t('admin.common.operationFailed', '操作失败')); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await playlistsApi.delete(deleteId); toast.success(t('admin.common.deleteSuccess', '删除成功')); fetchPlaylists(); if (activePlaylist?.id === deleteId) setActivePlaylist(null); }
    catch { toast.error('删除失败'); }
    finally { setDeleteId(null); }
  };

  const handleImport = async () => {
    if (!importForm.playlist_id.trim()) { toast.error(t('admin.playlists.idRequired', '请输入歌单 ID')); return; }
    setImporting(true);
    try {
      const r: any = await playlistsApi.import(importForm.server, importForm.playlist_id, importForm.title || t('admin.playlists.import', '导入歌单'));
      toast.success(`导入成功，共 ${r.data?.imported || 0} 首`);
      setShowImport(false); fetchPlaylists();
    } catch (e: any) { toast.error(e?.response?.data?.error?.message || '导入失败'); }
    finally { setImporting(false); }
  };

  // Open playlist detail
  const openPlaylist = async (p: any) => {
    setActivePlaylist(p);
    try {
      const r: any = await playlistsApi.get(p.id);
      setPlaylistSongs(r.data?.songs || []);
    } catch { toast.error('获取歌曲失败'); }
  };

  // Add song to playlist
  const addSongToPlaylist = async (musicId: number) => {
    if (!activePlaylist) return;
    try {
      await playlistsApi.addSong(activePlaylist.id, musicId);
      toast.success(t('admin.common.addSuccess', '添加成功'));
      openPlaylist(activePlaylist); // Refresh
      fetchPlaylists();
    } catch { toast.error('添加失败'); }
  };

  // Remove song from playlist
  const removeSong = async (musicId: number) => {
    if (!activePlaylist) return;
    try {
      await playlistsApi.removeSong(activePlaylist.id, musicId);
      toast.success(t('admin.common.removed', '已移除'));
      openPlaylist(activePlaylist);
      fetchPlaylists();
    } catch { toast.error('移除失败'); }
  };

  // Load all music for add-song picker
  const loadAllMusic = async () => {
    try { const r: any = await musicApi.list({ per_page: 500 }); setAllMusic(r.data || []); }
    catch {}
    setShowAddSong(true);
  };

  const filteredMusic = searchKeyword
    ? allMusic.filter(m => m.title?.includes(searchKeyword) || m.artist?.includes(searchKeyword))
    : allMusic;

  const songIds = new Set(playlistSongs.map((s: any) => s.id));

  return (
    <div>
      {/* 标题由 DashboardLayout 的全局 header 渲染（pageTitleMap 里有 /playlists），
          这里只出操作按钮，不要再画第二个 h1。 */}
      <AdminToolbar
        actions={
          <>
            <Button variant="outline" onClick={() => setShowImport(true)}>{t('admin.playlists.import', '导入歌单')}</Button>
            <Button onClick={openCreate}><Plus />{t('admin.playlists.create', '创建歌单')}</Button>
          </>
        }
      />

      <div className="flex gap-4">
        {/* Left: playlist list */}
        <div className="w-75 shrink-0">
          {loading ? (
            <LoadingState />
          ) : playlists.length === 0 ? (
            <EmptyState title="暂无歌单" actionText={t('admin.common.create', '创建')} onAction={openCreate} />
          ) : (
            <div className="flex flex-col gap-2">
              {playlists.map((p) => (
                <Card
                  key={p.id}
                  onClick={() => openPlaylist(p)}
                  className={cn(
                    'cursor-pointer px-4 py-3.5 transition-colors hover:border-primary',
                    activePlaylist?.id === p.id && 'border-primary',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-0.5 text-sm font-semibold text-foreground">
                        {p.title}
                        {p.is_default && <span className="ml-1.5 rounded-sm bg-muted px-1 py-px text-3xs text-primary">{t('admin.common.default', '默认')}</span>}
                      </h3>
                      <p className="text-xs text-muted-foreground">{p.song_count || 0} 首</p>
                    </div>
                    <RowActionGroup className="shrink-0">
                      {/* 卡片整体可点击，这两个按钮必须 stopPropagation */}
                      <RowAction icon={Pencil} title="编辑" onClick={(e) => { e.stopPropagation(); openEdit(p); }} />
                      <RowAction icon={Trash2} tone="danger" title="删除" onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} />
                    </RowActionGroup>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: playlist songs */}
        <div className="flex-1">
          {activePlaylist ? (
            <Card className="p-4">
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-sm-plus font-semibold text-foreground">{activePlaylist.title}</h2>
                <Button size="sm" onClick={loadAllMusic}><Plus />{t('admin.playlists.addSong', '添加歌曲')}</Button>
              </div>

              {playlistSongs.length === 0 ? (
                <EmptyState title="歌单暂无歌曲" />
              ) : (
                <div>
                  {playlistSongs.map((s: any, i: number) => (
                    <div
                      key={s.id}
                      className={cn(
                        'flex items-center gap-2.5 px-1 py-2',
                        i < playlistSongs.length - 1 && 'border-b border-border',
                      )}
                    >
                      <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
                      {s.cover_url && <img src={s.cover_url} alt="" className="size-9 shrink-0 rounded-sm object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs-plus font-medium text-foreground">{s.title}</p>
                        <p className="text-2xs text-muted-foreground">{s.artist || ''}</p>
                      </div>
                      <span className="shrink-0 text-2xs text-muted-foreground">
                        {{
                          netease: t('admin.music.platform.neteaseShort', '网易云'),
                          tencent: 'QQ',
                          kugou: t('admin.music.platform.kugouShort', '酷狗'),
                          local: t('admin.common.local', '本地'),
                        }[s.platform as string] || s.platform || ''}
                      </span>
                      <RowAction icon={X} tone="danger" title="移除" onClick={() => removeSong(s.id)} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <EmptyState title="选择左侧歌单查看歌曲" />
          )}
        </div>
      </div>

      {/* Create/Edit modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent className="max-w-100">
          <DialogHeader>
            <DialogTitle>{editingId ? t('admin.playlists.edit', '编辑歌单') : t('admin.playlists.create', '创建歌单')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.playlists.name', '歌单名称')}</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.playlists.coverUrl', '封面 URL')}</Label>
              <Input value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })} placeholder="可选" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.description', '描述')}</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-xs-plus">
              <Checkbox checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
              <span className="text-muted-foreground">{t('admin.playlists.setDefault', '设为默认歌单')}</span>
            </label>
            <DialogActions
              onCancel={() => setShowModal(false)}
              onSubmit={onSubmit}
              submitting={submitting}
              submitText={editingId ? t('admin.common.save', '保存') : t('admin.common.create', '创建')}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Import modal */}
      <Dialog open={showImport} onOpenChange={(o) => !o && setShowImport(false)}>
        <DialogContent className="max-w-100">
          <DialogHeader>
            <DialogTitle>{t('admin.playlists.importExternal', '导入外部歌单')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.platform', '平台')}</Label>
              <Select value={importForm.server} onValueChange={v => setImportForm({ ...importForm, server: v as string })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="netease">{t('admin.music.platform.netease', '网易云音乐')}</SelectItem>
                  <SelectItem value="kugou">{t('admin.music.platform.kugou', '酷狗音乐')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.playlists.playlistId', '歌单 ID')}</Label>
              <Input value={importForm.playlist_id} onChange={e => setImportForm({ ...importForm, playlist_id: e.target.value })} placeholder="从歌单链接中获取数字 ID" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.playlists.name', '歌单名称')}</Label>
              <Input value={importForm.title} onChange={e => setImportForm({ ...importForm, title: e.target.value })} placeholder="可选，不填默认为'导入歌单'" />
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.playlists.neteaseIdHint', '网易云歌单 ID 在链接中：music.163.com/playlist?id=')}<strong>{t('admin.common.number', '数字')}</strong></p>
            <DialogActions
              onCancel={() => setShowImport(false)}
              onSubmit={handleImport}
              submitting={importing}
              submitText="导入"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add song picker modal */}
      <Dialog open={showAddSong} onOpenChange={(o) => !o && setShowAddSong(false)}>
        <DialogContent className="max-w-130">
          <DialogHeader>
            <DialogTitle>{t('admin.playlists.addSongToPlaylist', '添加歌曲到歌单')}</DialogTitle>
          </DialogHeader>
          <div>
            <Input placeholder="搜索已有歌曲…" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} className="mb-3" />
            <div className="max-h-100 overflow-auto">
              {filteredMusic.length === 0 ? (
                <EmptyState
                  className="py-8"
                  title={allMusic.length === 0 ? t('admin.playlists.noSongs', '暂无歌曲，请先在音乐管理中添加') : t('admin.common.noMatches', '无匹配结果')}
                />
              ) : filteredMusic.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2.5 border-b border-border px-1 py-2">
                  {m.cover_url && <img src={m.cover_url} alt="" className="size-8 shrink-0 rounded-sm object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs-plus font-medium text-foreground">{m.title}</p>
                    <p className="text-2xs text-muted-foreground">{m.artist}</p>
                  </div>
                  {songIds.has(m.id) ? (
                    <span className="text-2xs text-muted-foreground">{t('admin.common.added', '已添加')}</span>
                  ) : (
                    <Button size="icon-sm" title="添加到歌单" aria-label="添加到歌单" onClick={() => addSongToPlaylist(m.id)}><Plus /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDelete} title="确认删除" message="删除歌单后歌曲不会被删除" />
    </div>
  );
}
