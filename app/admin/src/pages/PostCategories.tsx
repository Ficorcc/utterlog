import { useEffect, useState, useRef } from 'react';
import { categoriesApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { Plus, Folder, FolderOpen, CloudUpload, Pencil, Trash2 } from 'lucide-react';
import {
  Button, buttonVariants, Input, Label, Textarea, EmptyState, LoadingState, ConfirmDialog, Card,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/shadcn';
import { RowAction, RowActionGroup } from '@/components/ui/row-actions';
import { usePostsToolbar } from '@/layouts/PostsLayout';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SELECT_CLS } from './settings/shared';

export default function CategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [iconValue, setIconValue] = useState('');
  const [, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', slug: '', description: '', parent_id: '', seo_keywords: '' },
  });

  const { setToolbar } = usePostsToolbar();

  useEffect(() => {
    setToolbar(
      <Button variant="outline" size="icon" title={t('admin.categories.newCategory', '新建分类')} onClick={openCreate}>
        <Plus />
      </Button>
    );
    return () => setToolbar(null);
  }, [t]);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response: any = await categoriesApi.list();
      setCategories(response.data || []);
    } catch { toast.error(t('admin.categories.toast.fetchFailed', '获取分类失败')); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingId(null);
    setIconValue('');
    reset({ name: '', slug: '', description: '', parent_id: '', seo_keywords: '' });
    setIsModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setIconValue(cat.icon || '');
    reset({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      seo_keywords: cat.seo_keywords || '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        slug: data.slug || data.name,
        icon: iconValue || null,
        description: data.description || null,
        parent_id: data.parent_id ? parseInt(data.parent_id) : null,
        seo_keywords: data.seo_keywords || null,
      };
      if (editingId) {
        await categoriesApi.update(editingId, payload);
        toast.success(t('admin.common.updateSuccess', '更新成功'));
      } else {
        await categoriesApi.create(payload);
        toast.success(t('admin.common.createSuccess', '创建成功'));
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch { toast.error(editingId ? t('admin.common.updateFailed', '更新失败') : t('admin.common.createFailed', '创建失败')); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await categoriesApi.delete(deleteId); toast.success(t('admin.common.deleteSuccess', '删除成功')); fetchCategories(); }
    catch { toast.error(t('admin.common.deleteFailed', '删除失败')); }
    finally { setDeleteId(null); }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'svg') {
      const text = await file.text();
      const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
      if (svgMatch) {
        setIconValue(svgMatch[0]);
        toast.success(t('admin.categories.toast.svgAdded', 'SVG 图标已添加'));
      } else {
        toast.error(t('admin.categories.toast.invalidSvg', '无效的 SVG 文件'));
      }
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (!['png', 'gif', 'jpg', 'jpeg', 'webp', 'avif', 'ico'].includes(ext || '')) {
      toast.error(t('admin.categories.toast.invalidIconFormat', '请上传 SVG/PNG/GIF/JPG/WebP/AVIF 格式'));
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r: any = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.url || r.data?.url;
      if (url) {
        setIconValue(url);
        toast.success(t('admin.categories.toast.iconUploaded', '图标已上传'));
      }
    } catch { toast.error(t('admin.common.uploadFailed', '上传失败')); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  // Category icon is user data — may be a FontAwesome class, inline SVG, or
  // image URL. Keep rendering all three; only the empty placeholder is Lucide.
  const renderIcon = (icon: string) => {
    if (!icon) return <Folder className="text-muted-foreground size-4.5" />;
    if (icon.startsWith('fa-') || icon.startsWith('fa ')) {
      return <i className={`${icon} text-primary text-lg`} />;
    }
    if (icon.startsWith('<svg')) {
      return <span className="inline-flex size-4.5" dangerouslySetInnerHTML={{ __html: icon.replace(/<svg/, '<svg width="18" height="18"') }} />;
    }
    if (icon.startsWith('http') || icon.startsWith('/')) {
      return <img src={icon} alt="" className="size-4.5 object-contain" />;
    }
    return <i className={`fa-sharp fa-light fa-${icon} text-primary text-lg`} />;
  };

  return (
    <div>
      {loading ? (
        <LoadingState label={t('common.loading', '加载中…')} />
      ) : categories.length === 0 ? (
        <EmptyState
          title={t('admin.categories.emptyTitle', '暂无分类')}
          description={t('admin.categories.emptyDescription', '创建您的第一个文章分类')}
          actionText={t('admin.categories.newCategory', '新建分类')}
          onAction={openCreate}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">{t('admin.categories.columns.icon', '图标')}</TableHead>
                <TableHead className="w-44">{t('admin.common.name', '名称')}</TableHead>
                <TableHead className="w-56">Slug</TableHead>
                <TableHead>{t('admin.common.description', '描述')}</TableHead>
                <TableHead className="w-20">{t('admin.categories.postCount', '文章数')}</TableHead>
                <TableHead className="w-22.5 text-right">{t('admin.common.actions', '操作')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((row) => (
                <TableRow key={row.id}>
                  <TableCell><div className="flex items-center justify-center">{renderIcon(row.icon)}</div></TableCell>
                  <TableCell className="max-w-44 truncate font-semibold" title={row.name}>{row.name}</TableCell>
                  <TableCell><code className="truncate font-mono text-xs text-muted-foreground" title={`/${row.slug}`}>/{row.slug}</code></TableCell>
                  <TableCell className="max-w-0 truncate text-muted-foreground" title={row.description || ''}>{row.description || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.count ?? 0}</TableCell>
                  <TableCell>
                    <RowActionGroup>
                      <RowAction icon={Pencil} title={t('admin.common.edit', '编辑')} onClick={() => openEdit(row)} />
                      <RowAction icon={Trash2} tone="danger" title={t('admin.common.delete', '删除')} onClick={() => setDeleteId(row.id)} />
                    </RowActionGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t('admin.categories.editCategory', '编辑分类') : t('admin.categories.newCategory', '新建分类')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Icon */}
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.categories.icon', '分类图标')}</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
                  {iconValue ? renderIcon(iconValue) : <FolderOpen className="size-5 text-muted-foreground" />}
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}>
                      <CloudUpload /> {t('admin.cover.uploadImage', '上传图片')}
                      <input ref={fileRef} type="file" accept=".svg,.png,.gif,.jpg,.jpeg,.webp,.avif,.ico" className="hidden" onChange={handleIconUpload} />
                    </label>
                    {iconValue && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIconValue('')}>{t('admin.common.clear', '清空')}</Button>
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground">{t('admin.categories.iconHint', '支持 FontAwesome 类名、SVG 代码、PNG/GIF/JPG/WebP/AVIF')}</p>
                </div>
              </div>
              <Input
                className="mt-2 font-mono text-xs"
                placeholder={t('admin.categories.iconPlaceholder', 'fa-sharp fa-light fa-code 或 SVG 代码 / 图片 URL')}
                value={iconValue}
                onChange={e => setIconValue(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.name', '名称')}</Label>
              <Input {...register('name', { required: t('admin.validation.nameRequired', '名称不能为空') })} aria-invalid={errors.name ? true : undefined} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message as string}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Slug</Label>
              <Input {...register('slug', { required: t('admin.validation.slugRequired', 'Slug不能为空') })} aria-invalid={errors.slug ? true : undefined} />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug.message as string}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.categories.parent', '父分类')}</Label>
              <select className={SELECT_CLS} {...register('parent_id')}>
                <option value="">{t('admin.common.none', '无')}</option>
                {categories.filter(c => c.id !== editingId).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.common.description', '描述')}</Label>
              <Textarea rows={2} {...register('description')} placeholder={t('admin.common.optional', '可选')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.posts.columns.keywords', '关键词')}</Label>
              <Input {...register('seo_keywords')} placeholder={t('admin.categories.keywordsPlaceholder', '多个关键词用逗号分隔，如：Linux,服务器,运维')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('admin.common.cancel', '取消')}</Button>
              <Button type="submit" disabled={submitting}>{editingId ? t('admin.common.save', '保存') : t('admin.common.create', '创建')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('admin.posts.confirmDeleteTitle', '确认删除')}
        message={t('admin.categories.confirmDeleteMessage', '删除分类后，相关文章将变为未分类，是否确认？')}
      />
    </div>
  );
}
