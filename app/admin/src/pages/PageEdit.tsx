import { Sparkles } from 'lucide-react';

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router';
import { postsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button, Input, Textarea, Label, Switch, LoadingState } from '@/components/ui/shadcn';
import { SaveButton } from '@/components/ui';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';

import MarkdownEditor from '@/components/editor/MarkdownEditor';

export default function EditPostPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const postId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [allowComment, setAllowComment] = useState(true);
  // status 和 password 没有对应控件，但要读回来原样提交回去 —— 页面编辑器不该
  // 顺手把已有的发布状态和私密密码改掉。分类 / 标签 / 置顶 / 发布时间原先也读了，
  // 但既不显示也不提交，是从 PostEdit 复制来的死代码；后端 updatePostColumns 只
  // 更新 body 里出现的列，不传就不动，所以删掉它们不会丢数据。
  const [status, setStatus] = useState<'draft' | 'publish' | 'private' | 'pending'>('publish');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const response: any = await postsApi.get(postId);
      const post = response.data;
      setTitle(post.title || '');
      setContent(post.content || '');
      setSlug(post.slug || '');
      setCoverUrl(post.cover_url || '');
      setStatus(post.status || 'draft');
      setExcerpt(post.excerpt || '');
      setPassword(post.password || '');
      setAllowComment(post.allow_comment !== false);
    } catch {
      toast.error('获取文章失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error(t('admin.postEditor.toast.titleRequired', '标题不能为空')); return; }
    setSubmitting(true);
    try {
      await postsApi.update(postId, {
        title, content,
        slug: slug || undefined,
        cover_url: coverUrl || undefined,
        type: 'page',
        status,
        excerpt: excerpt || undefined,
        password: password || undefined,
        allow_comment: allowComment,
      } as any);
      toast.success(t('admin.postEditor.toast.pageUpdated', '页面更新成功'));
    } catch {
      toast.error(t('admin.common.updateFailed', '更新失败'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState className="h-[calc(100vh-100px)]" />;
  }

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
              <SaveButton loading={submitting} label="保存" onClick={handleSave} className="min-w-0 flex-1 px-2" />
              <Button variant="outline" onClick={() => navigate('/pages')} className="min-w-0 flex-1 px-2">{t('admin.common.back', '返回')}</Button>
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
