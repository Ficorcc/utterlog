import { Sparkles } from 'lucide-react';

import { useState } from 'react';
import { useNavigate } from '@/lib/router';
import { postsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button, Input, Textarea, Label, Switch } from '@/components/ui/shadcn';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';

import MarkdownEditor from '@/components/editor/MarkdownEditor';

export default function CreatePostPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // 这个页面是从 PostCreate 复制来再删减 UI 的，分类 / 标签 / 置顶 / 发布时间 /
  // 私密密码的 state 一直留着但没有对应控件，也没进 payload —— 全是死代码，清掉。
  // 要给页面补这些功能时，连同输入控件一起加回来，别只留状态。
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [allowComment, setAllowComment] = useState(true);

  const handleSave = async (saveStatus?: string) => {
    if (!title.trim()) { toast.error(t('admin.postEditor.toast.titleRequired', '标题不能为空')); return; }
    setSubmitting(true);
    try {
      await postsApi.create({
        title, content,
        slug: slug || undefined,
        cover_url: coverUrl || undefined,
        type: 'page',
        status: saveStatus || 'publish',
        excerpt: excerpt || undefined,
        allow_comment: allowComment,
      } as any);
      toast.success(t('admin.postEditor.toast.pageCreated', '页面创建成功'));
      navigate('/pages');
    } catch {
      toast.error(t('admin.common.createFailed', '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border border-r-0 border-border">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="在此输入标题…"
            className="border-0 border-b border-border bg-transparent px-5 py-3.5 text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor value={content} onChange={setContent} className="h-full rounded-none border-0" minHeight="100%" />
          </div>
        </div>

        <div className="w-70 shrink-0 overflow-y-auto overflow-x-hidden border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="flex gap-1.5">
              <Button onClick={() => handleSave('publish')} disabled={submitting} className="min-w-0 flex-1 px-2">{t('admin.postEditor.publish', '发布')}</Button>
              <Button variant="outline" onClick={() => handleSave('draft')} disabled={submitting} className="min-w-0 flex-1 px-2">{t('admin.common.save', '保存')}</Button>
              <Button variant="outline" onClick={() => navigate(-1)} className="min-w-0 flex-1 px-2">{t('admin.common.back', '返回')}</Button>
            </div>
          </div>

          <div className="border-b border-border p-4">
            <h3 className="mb-3.5 text-xs-plus font-semibold text-foreground">{t('admin.postEditor.settings', '设置')}</h3>
            <div className="flex flex-col gap-3.5">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">{t('admin.postEditor.slug', '别名 (Slug)')}</Label>
                <div className="flex items-stretch gap-1.5">
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="留空自动分配" className="h-9 flex-1 text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    title="AI 生成 Slug"
                    onClick={async () => {
                      if (!title) return;
                      try { const r: any = await api.post('/ai/slug', { title, content }); if (r.success && r.data?.slug) { setSlug(r.data.slug); toast.success('Slug 已生成'); } } catch { toast.error(t('admin.postEditor.toast.aiUnavailable', 'AI 服务不可用')); }
                    }}
                  >
                    <Sparkles />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">{t('admin.postEditor.coverUrl', '自定义封面图 URL')}</Label>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="留空自动回退为正文首图" className="h-9 text-xs" />
              </div>
            </div>
          </div>

          <div className="p-4">
            <h3 className="mb-3.5 text-xs-plus font-semibold text-foreground">{t('admin.postEditor.advanced', '高级')}</h3>
            <div className="flex flex-col gap-3.5">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">{t('admin.postEditor.excerpt', '摘要')}</Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="留空自动截取" rows={3} className="resize-y text-xs" />
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  {/* 用 Label htmlFor 而不是 span：原来是 <label> 包 checkbox，点文字能切换，
                      换成 Switch 后要保住这个行为，也和文章编辑器的 ToggleRow 一致。 */}
                  <Label htmlFor="page-allow-comment" className="cursor-pointer text-xs font-normal text-foreground">{t('admin.postEditor.allowComments', '允许评论')}</Label>
                  <Switch id="page-allow-comment" checked={allowComment} onCheckedChange={setAllowComment} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
