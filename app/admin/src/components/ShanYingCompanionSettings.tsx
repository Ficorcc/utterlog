import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { optionsApi, playlistsApi } from '@/lib/api';
import {
  Button, Card, Input, Label, LoadingState, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Switch,
} from '@/components/ui/shadcn';

type Settings = {
  musicEnabled: boolean;
  playlistId: string;
  petEnabled: boolean;
  petName: string;
  petMobile: boolean;
  side: 'left' | 'right';
};

const initial: Settings = {
  musicEnabled: true,
  playlistId: 'auto',
  petEnabled: true,
  petName: '啾啾',
  petMobile: true,
  side: 'left',
};

const enabled = (value: unknown, fallback = true) => value == null || value === '' ? fallback : String(value) !== 'false';

export default function ShanYingCompanionSettings() {
  const [settings, setSettings] = useState(initial);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([optionsApi.list(), playlistsApi.list({ per_page: 500 })])
      .then(([optionsResponse, playlistsResponse]: any[]) => {
        const options = optionsResponse.data || optionsResponse;
        setPlaylists(playlistsResponse.data || []);
        setSettings({
          musicEnabled: enabled(options.shanying_music_enabled),
          playlistId: String(options.shanying_music_playlist_id || 'auto'),
          petEnabled: enabled(options.shanying_pet_enabled),
          petName: String(options.shanying_pet_name || '啾啾'),
          petMobile: enabled(options.shanying_pet_mobile),
          side: options.shanying_companion_side === 'right' ? 'right' : 'left',
        });
      })
      .catch(() => toast.error('加载小鸟与音乐设置失败'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await optionsApi.updateMany({
        shanying_music_enabled: String(settings.musicEnabled),
        shanying_music_playlist_id: settings.playlistId,
        shanying_pet_enabled: String(settings.petEnabled),
        shanying_pet_name: settings.petName.trim() || '啾啾',
        shanying_pet_mobile: String(settings.petMobile),
        shanying_companion_side: settings.side,
      });
      toast.success('小鸟与音乐设置已保存');
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
        <div className="flex items-center justify-between gap-5">
          <div>
            <h3 className="m-0 text-sm font-semibold text-foreground">悬浮音乐播放器</h3>
            <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
              在全站左下角显示“给此刻一点音乐”。播放器直接读取现有的歌曲和歌单；没有歌单时自动播放全部公开歌曲。
            </p>
          </div>
          <Switch checked={settings.musicEnabled} onCheckedChange={(value) => setSettings((current) => ({ ...current, musicEnabled: value }))} aria-label="启用音乐播放器" />
        </div>
        <div className="mt-5 max-w-md space-y-2 border-t border-border pt-4">
          <Label>播放歌单</Label>
          <Select value={settings.playlistId} onValueChange={(value) => setSettings((current) => ({ ...current, playlistId: value || 'auto' }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动：默认歌单 / 全部歌曲</SelectItem>
              {playlists.map((playlist) => <SelectItem key={playlist.id} value={String(playlist.id)}>{playlist.title}{playlist.is_default ? '（默认）' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
          {!playlists.length && <p className="m-0 text-xs text-muted-foreground">当前没有歌单，将使用全部公开歌曲。可在后台“歌单”页面创建歌单。</p>}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-5">
          <div>
            <h3 className="m-0 text-sm font-semibold text-foreground">小鸟伙伴</h3>
            <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
              小鸟停在播放器上方，会眨眼和摆尾；悬停或点击时回应，访客也可以拖动并保存位置。
            </p>
          </div>
          <Switch checked={settings.petEnabled} onCheckedChange={(value) => setSettings((current) => ({ ...current, petEnabled: value }))} aria-label="启用小鸟伙伴" />
        </div>
        <div className="mt-5 grid max-w-2xl gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="shanying-pet-name">小鸟名字</Label>
            <Input id="shanying-pet-name" value={settings.petName} maxLength={20} onChange={(event) => setSettings((current) => ({ ...current, petName: event.target.value }))} placeholder="啾啾" />
          </div>
          <div className="space-y-2">
            <Label>默认位置</Label>
            <Select value={settings.side} onValueChange={(value) => setSettings((current) => ({ ...current, side: value === 'right' ? 'right' : 'left' }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="left">左下角</SelectItem><SelectItem value="right">右下角</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-5 rounded-lg border border-border p-3 sm:col-span-2">
            <div><Label>移动端显示</Label><p className="mb-0 mt-1 text-xs text-muted-foreground">在手机和平板上同时显示小鸟与播放器。</p></div>
            <Switch checked={settings.petMobile} onCheckedChange={(value) => setSettings((current) => ({ ...current, petMobile: value }))} aria-label="移动端显示" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存设置'}</Button>
      </div>
    </div>
  );
}
