
import { useState, useEffect } from 'react';
import api, { mediaApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, ImageIcon, Eye, EyeOff, Trash2, Check } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  EmptyState,
  Input,
  Label,
  LoadingState,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Textarea,
} from '@/components/ui/shadcn';
import { RowAction } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { AdminToolbar, DialogActions, MediaItemGrid } from '@/components/ui';

interface Album {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_url: string;
  status: string;
  sort_order: number;
  photo_count: number;
  created_at: number;
}

export default function AlbumsPage() {
  const { t } = useI18n();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', description: '', status: 'private' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [, setDeleting] = useState(false);

  // Photo management
  const [manageAlbum, setManageAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<number[]>([]);

  useEffect(() => { fetchAlbums(); }, []);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const r: any = await api.get('/albums?per_page=500');
      setAlbums(r.data?.albums || r.data || []);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title) { toast.error(t('admin.albums.titleRequired', '请输入相册标题')); return; }
    setSaving(true);
    try {
      await api.post('/albums', form);
      toast.success('相册已创建');
      setShowCreate(false);
      setForm({ title: '', slug: '', description: '', status: 'private' });
      fetchAlbums();
    } catch { toast.error(t('admin.common.createFailed', '创建失败')); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editAlbum) return;
    setSaving(true);
    try {
      await api.put(`/albums/${editAlbum.id}`, form);
      toast.success('已更新');
      setEditAlbum(null);
      fetchAlbums();
    } catch { toast.error(t('admin.common.updateFailed', '更新失败')); }
    setSaving(false);
  };

  const openCreate = () => {
    setShowCreate(true);
    setForm({ title: '', slug: '', description: '', status: 'private' });
  };

  const openEdit = (album: Album) => {
    setEditAlbum(album);
    setForm({ title: album.title, slug: album.slug, description: album.description, status: album.status });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/albums/${deleteId}`);
      toast.success(t('admin.common.deleted', '已删除'));
      fetchAlbums();
    } catch { toast.error(t('admin.common.deleteFailed', '删除失败')); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const toggleStatus = async (album: Album) => {
    const newStatus = album.status === 'public' ? 'private' : 'public';
    try {
      await api.put(`/albums/${album.id}`, { status: newStatus });
      toast.success(newStatus === 'public' ? '已公开' : '已设为私有');
      fetchAlbums();
    } catch { toast.error(t('admin.common.operationFailed', '操作失败')); }
  };

  // Photo management
  const openManage = async (album: Album) => {
    setManageAlbum(album);
    try {
      const r: any = await api.get(`/albums/${album.id}/photos?per_page=500`);
      setPhotos(r.data?.photos || r.data || []);
    } catch {}
  };

  const openAddPhotos = async () => {
    setShowAddPhotos(true);
    setSelectedMedia([]);
    try {
      const r: any = await mediaApi.list({ category: 'image', per_page: 500 });
      const files = r.data?.files || r.data || [];
      // Filter out photos already in this album
      const albumPhotoIds = new Set(photos.map((p: any) => p.id));
      setMediaList(files.filter((f: any) => !albumPhotoIds.has(f.id)));
    } catch {}
  };

  const addSelectedPhotos = async () => {
    if (!manageAlbum || selectedMedia.length === 0) return;
    try {
      await api.post(`/albums/${manageAlbum.id}/photos`, { media_ids: selectedMedia });
      toast.success(`已添加 ${selectedMedia.length} 张照片`);
      setShowAddPhotos(false);
      openManage(manageAlbum);
      fetchAlbums();
    } catch { toast.error(t('admin.common.addFailed', '添加失败')); }
  };

  const removePhoto = async (mediaId: number) => {
    if (!manageAlbum) return;
    try {
      await api.delete(`/albums/${manageAlbum.id}/photos/${mediaId}`);
      setPhotos(prev => prev.filter((p: any) => p.id !== mediaId));
      fetchAlbums();
    } catch { toast.error(t('admin.common.removeFailed', '移除失败')); }
  };

  return (
    <div>
      <AdminToolbar
        meta="管理照片相册，公开相册将在前端展示"
        actions={
          <Button size="icon" title={t('admin.albums.newAlbum', '新建相册')} onClick={openCreate}>
            <Plus />
          </Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : albums.length === 0 ? (
        <EmptyState title="暂无相册" actionText="创建第一个相册" onAction={openCreate} />
      ) : (
        <MediaItemGrid
          showComment={false}
          items={albums}
          onEdit={openEdit}
          onDelete={setDeleteId}
          minWidth={280}
          coverFallback={<ImageIcon className="size-8 text-muted-foreground" />}
          onCoverClick={openManage}
          coverBadge={(album) => (
            <span className={cn(
              'absolute right-2 top-2 px-2 py-0.5 text-2xs font-semibold',
              album.status === 'public' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
            )}>
              {album.status === 'public' ? t('admin.common.public', '公开') : t('admin.common.private', '私有')}
            </span>
          )}
          subtitle={(album) => album.description || ''}
          meta={(album) => `${album.photo_count} 张照片`}
          extraActions={(album) => (
            <RowAction
              icon={album.status === 'public' ? EyeOff : Eye}
              tone="warning"
              active={album.status === 'private'}
              title={album.status === 'public' ? t('admin.albums.setPrivate', '设为私有') : t('admin.common.public', '公开')}
              onClick={() => toggleStatus(album)}
            />
          )}
        />
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreate || !!editAlbum} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditAlbum(null); } }}>
        <DialogContent className="max-w-100">
          <DialogHeader>
            <DialogTitle>{editAlbum ? t('admin.albums.editAlbum', '编辑相册') : t('admin.albums.newAlbum', '新建相册')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.title', '标题')}</Label>
              <Input value={form.title} onChange={(e: any) => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.albums.slugUrl', '别名 (URL)')}</Label>
              <Input value={form.slug} onChange={(e: any) => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="自动生成" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.description', '描述')}</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="相册描述…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.albums.visibility', '可见性')}</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as string }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{t('admin.common.private', '私有')}</SelectItem>
                  <SelectItem value="public">{t('admin.common.public', '公开')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogActions
              onCancel={() => { setShowCreate(false); setEditAlbum(null); }}
              onSubmit={editAlbum ? handleUpdate : handleCreate}
              submitting={saving}
              submitText={editAlbum ? t('admin.common.update', '更新') : t('admin.common.create', '创建')}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Management Modal */}
      <Dialog open={!!manageAlbum} onOpenChange={(o) => { if (!o) { setManageAlbum(null); setPhotos([]); } }}>
        <DialogContent className="max-h-[calc(100vh-32px)] max-w-170 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{manageAlbum ? `${manageAlbum.title} — 照片管理` : ''}</DialogTitle>
          </DialogHeader>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs-plus text-muted-foreground">{photos.length} 张照片</span>
              <Button onClick={openAddPhotos}><Plus /> {t('admin.albums.addFromMedia', '从媒体库添加')}</Button>
            </div>
            {photos.length === 0 ? (
              <EmptyState title="暂无照片，从媒体库添加" />
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {photos.map((photo: any) => (
                  <div key={photo.id} className="group relative aspect-square overflow-hidden bg-muted">
                    <img src={photo.url} alt="" className="size-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-xs"
                      title="移除"
                      aria-label="移除"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Photos from Media Library Modal */}
      <Dialog open={showAddPhotos} onOpenChange={(o) => !o && setShowAddPhotos(false)}>
        <DialogContent className="max-h-[calc(100vh-32px)] max-w-170 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.albums.selectFromMedia', '从媒体库选择照片')}</DialogTitle>
          </DialogHeader>
          <div>
            {mediaList.length === 0 ? (
              <EmptyState title="媒体库中暂无可用图片" />
            ) : (
              <>
                <div className="mb-4 grid max-h-100 gap-2 overflow-y-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                  {mediaList.map((file: any) => {
                    const selected = selectedMedia.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedMedia(prev => selected ? prev.filter(id => id !== file.id) : [...prev, file.id])}
                        className={cn(
                          'relative aspect-square cursor-pointer overflow-hidden',
                          selected ? 'ring-2 ring-primary' : 'border border-border',
                        )}
                      >
                        <img src={file.url} alt="" className="size-full object-cover" />
                        {selected && (
                          <div className="absolute right-1 top-1 flex size-5 items-center justify-center bg-primary text-primary-foreground">
                            <Check className="size-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddPhotos(false)}>{t('admin.common.cancel', '取消')}</Button>
                  <Button onClick={addSelectedPhotos} disabled={selectedMedia.length === 0}>
                    添加 {selectedMedia.length > 0 ? `(${selectedMedia.length})` : ''}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        title="确认删除"
        message="删除后无法恢复，照片不会被删除，只是取消关联。"
      />
    </div>
  );
}
