import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { optionsApi } from '@/lib/api';
import { Button, Card, Input, Label, LoadingState, Textarea } from '@/components/ui/shadcn';

interface RobesSettings {
  notice: string;
  mood: string;
  accent: string;
  footerText: string;
  icp: string;
  siteStart: string;
}

const initial: RobesSettings = {
  notice: '',
  mood: '',
  accent: '#839ac9',
  footerText: '',
  icp: '',
  siteStart: '',
};

/**
 * Robes 主题设置：站内公告、站长心情、强调色、页脚文案、备案号、建站日期。
 *
 * 这些值写进 options 表，前台主题通过 ThemeContext.options 读取：
 *   robes_notice     多行公告，每行一条，可写「2026-11-05｜公告内容」
 *   robes_mood       站长心情（通知面板「小站」页）
 *   robes_accent     主题强调色（覆盖默认 #839ac9）
 *   robes_footer_text 页脚版权文案
 *   robes_icp        备案号
 *   robes_site_start 建站日期（关于页「建于 xxxx.xx.xx」）
 */
export default function RobesNoticeSettings() {
  const [settings, setSettings] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    optionsApi
      .list()
      .then((response: any) => {
        const options = response.data || response;
        setSettings({
          notice: String(options.robes_notice || ''),
          mood: String(options.robes_mood || ''),
          accent: String(options.robes_accent || '#839ac9'),
          footerText: String(options.robes_footer_text || ''),
          icp: String(options.robes_icp || ''),
          siteStart: String(options.robes_site_start || ''),
        });
      })
      .catch(() => toast.error('加载 Robes 设置失败'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await optionsApi.updateMany({
        robes_notice: settings.notice,
        robes_mood: settings.mood,
        robes_accent: settings.accent.trim() || '#839ac9',
        robes_footer_text: settings.footerText,
        robes_icp: settings.icp,
        robes_site_start: settings.siteStart.trim(),
      });
      toast.success('Robes 设置已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState className="py-5" />;

  return (
    <div className="mt-6 space-y-4">
      <Card className="p-5">
        <h3 className="m-0 text-sm font-semibold text-foreground">通知面板 · 小站</h3>
        <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
          顶栏铃铛面板会显示公告、站长心情与最新评论。公告每行一条，支持「2026-11-05｜公告内容」的带日期写法。
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="robes-notice">站内公告</Label>
            <Textarea
              id="robes-notice"
              rows={5}
              value={settings.notice}
              onChange={(event) => setSettings((current) => ({ ...current, notice: event.target.value }))}
              placeholder={'2026-11-14｜站点已升级到 Robes 主题\n2026-11-01｜友链申请请在留言板留言'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="robes-mood">站长心情</Label>
            <Input
              id="robes-mood"
              value={settings.mood}
              maxLength={80}
              onChange={(event) => setSettings((current) => ({ ...current, mood: event.target.value }))}
              placeholder="今天也在认真生活，慢慢来，别着急。"
            />
            <p className="m-0 text-xs text-muted-foreground">留空则使用站点简介。</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="m-0 text-sm font-semibold text-foreground">站点信息</h3>
        <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
          建站日期会显示在关于页的「建于 xxxx.xx.xx」位置，留空则按最早一篇文章推算。
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="robes-site-start">建站日期</Label>
            <Input
              id="robes-site-start"
              type="date"
              value={settings.siteStart}
              onChange={(event) => setSettings((current) => ({ ...current, siteStart: event.target.value }))}
            />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="m-0 text-sm font-semibold text-foreground">外观</h3>
        <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
          强调色会覆盖 Robes 默认的柔和蓝紫，玻璃层、按钮与高亮都会跟着变。
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="robes-accent">强调色</Label>
            <div className="flex items-center gap-2">
              <input
                id="robes-accent"
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(settings.accent) ? settings.accent : '#839ac9'}
                onChange={(event) => setSettings((current) => ({ ...current, accent: event.target.value }))}
                className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent"
                aria-label="选择强调色"
              />
              <Input
                value={settings.accent}
                onChange={(event) => setSettings((current) => ({ ...current, accent: event.target.value }))}
                placeholder="#839ac9"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="robes-footer">页脚文案</Label>
            <Input
              id="robes-footer"
              value={settings.footerText}
              onChange={(event) => setSettings((current) => ({ ...current, footerText: event.target.value }))}
              placeholder="© 2026 站点名"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="robes-icp">备案号</Label>
            <Input
              id="robes-icp"
              value={settings.icp}
              onChange={(event) => setSettings((current) => ({ ...current, icp: event.target.value }))}
              placeholder="京ICP备00000000号"
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存设置'}</Button>
      </div>
    </div>
  );
}
