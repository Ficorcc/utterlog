import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { optionsApi } from '@/lib/api';
import { Button, Card, Input, Label, LoadingState, Textarea } from '@/components/ui/shadcn';

interface RobesSettings {
  notice: string;
  mood: string;
  moodStatus: string;
  moodSongName: string;
  moodSongArtist: string;
  moodSongCover: string;
  moodSongUrl: string;
  moodUpdated: string;
  accent: string;
  footerText: string;
  icp: string;
  siteStart: string;
}

const initial: RobesSettings = {
  notice: '',
  mood: '',
  moodStatus: '',
  moodSongName: '',
  moodSongArtist: '',
  moodSongCover: '',
  moodSongUrl: '',
  moodUpdated: '',
  accent: '#839ac9',
  footerText: '',
  icp: '',
  siteStart: '',
};

/** 把歌曲四段字段拼成前台读的一段 JSON。 */
function buildSongJson(settings: RobesSettings) {
  if (!settings.moodSongName.trim()) return '';
  return JSON.stringify({
    name: settings.moodSongName.trim(),
    artist: settings.moodSongArtist.trim(),
    cover: settings.moodSongCover.trim(),
    url: settings.moodSongUrl.trim(),
  });
}

/** 反过来把 JSON 拆回四段字段。 */
function parseSongJson(raw: string) {
  if (!raw) return { name: '', artist: '', cover: '', url: '' };
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { name: '', artist: '', cover: '', url: '' };
    return {
      name: String(data.name || ''),
      artist: String(data.artist || ''),
      cover: String(data.cover || ''),
      url: String(data.url || ''),
    };
  } catch {
    return { name: '', artist: '', cover: '', url: '' };
  }
}

/**
 * Robes 主题设置：站内公告、站长心情、强调色、页脚文案、备案号、建站日期。
 *
 * 这些值写进 options 表，前台主题通过 ThemeContext.options 读取：
 *   robes_notice      多行公告，每行一条，可写「2026-11-05｜公告内容」
 *   robes_mood        站长心情（通知中心「心情」页）
 *   robes_mood_status 心情卡右上角的状态词，留空按是否有歌曲自动取
 *   robes_mood_song   心情卡的歌曲条（JSON：name/artist/cover/url）
 *   robes_mood_updated 心情卡底部的「更新于 …」文案
 *   robes_accent      主题强调色（覆盖默认 #839ac9）
 *   robes_footer_text 页脚版权文案
 *   robes_icp         备案号
 *   robes_site_start  建站日期（关于页「建于 xxxx.xx.xx」）
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
        const song = parseSongJson(String(options.robes_mood_song || ''));
        setSettings({
          notice: String(options.robes_notice || ''),
          mood: String(options.robes_mood || ''),
          moodStatus: String(options.robes_mood_status || ''),
          moodSongName: song.name,
          moodSongArtist: song.artist,
          moodSongCover: song.cover,
          moodSongUrl: song.url,
          moodUpdated: String(options.robes_mood_updated || ''),
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
        robes_mood_status: settings.moodStatus.trim(),
        robes_mood_song: buildSongJson(settings),
        robes_mood_updated: settings.moodUpdated.trim(),
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
        <h3 className="m-0 text-sm font-semibold text-foreground">通知中心</h3>
        <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
          顶栏信封面板有五个页签：公告 / 心情 / 漂流瓶 / 我的评论 / 最新评论。公告每行一条，支持「2026-11-05｜公告内容」的带日期写法。
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="robes-mood-status">心情状态词</Label>
              <Input
                id="robes-mood-status"
                value={settings.moodStatus}
                maxLength={12}
                onChange={(event) => setSettings((current) => ({ ...current, moodStatus: event.target.value }))}
                placeholder="听歌 / 记录生活"
              />
              <p className="m-0 text-xs text-muted-foreground">留空则填了歌曲显示「听歌」，否则显示「记录生活」。</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="robes-mood-updated">更新于</Label>
              <Input
                id="robes-mood-updated"
                value={settings.moodUpdated}
                maxLength={24}
                onChange={(event) => setSettings((current) => ({ ...current, moodUpdated: event.target.value }))}
                placeholder="11月14日 11:35"
              />
              <p className="m-0 text-xs text-muted-foreground">显示在心情卡底部，留空则不显示这一行。</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>心情卡歌曲条</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={settings.moodSongName}
                onChange={(event) => setSettings((current) => ({ ...current, moodSongName: event.target.value }))}
                placeholder="歌名，如：拾忆"
              />
              <Input
                value={settings.moodSongArtist}
                onChange={(event) => setSettings((current) => ({ ...current, moodSongArtist: event.target.value }))}
                placeholder="歌手，如：张翰"
              />
              <Input
                value={settings.moodSongCover}
                onChange={(event) => setSettings((current) => ({ ...current, moodSongCover: event.target.value }))}
                placeholder="封面图地址（https://…）"
              />
              <Input
                value={settings.moodSongUrl}
                onChange={(event) => setSettings((current) => ({ ...current, moodSongUrl: event.target.value }))}
                placeholder="试听音频地址（https://…）"
              />
            </div>
            <p className="m-0 text-xs text-muted-foreground">四项都填时显示圆盘 + 播放按钮的歌条，歌名留空则整条不显示。</p>
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
