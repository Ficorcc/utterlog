import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { optionsApi } from '@/lib/api';
import { Button, Card, Input, Label, LoadingState } from '@/components/ui/shadcn';

/**
 * Glaze 主题设置：配色、深浅色、背景、圆角、内容宽度。
 *
 * 这些值写进 options 表，前台主题通过 ThemeContext.options 读取，
 * 并写到根元素的 data-glaze-* 属性上：
 *   glaze_palette        配色（green / mint / teal / blue / indigo / violet /
 *                        pink / coral / amber / slate / cinnabar / bamboo /
 *                        ochre / lotus）
 *   glaze_scheme         深浅色（light / dark）
 *   glaze_background     背景效果（none / blue-preview / ripples）
 *   glaze_corners        圆角模式（squircle / square / round）
 *   glaze_content_width  内容宽度（300–1600，单位 px）
 *
 * 访客在前台配色器里的选择会记在 localStorage，优先级高于这里的默认值。
 */

const PALETTES = [
  { key: 'green', label: '青绿', color: '#09c849' },
  { key: 'mint', label: '薄荷', color: '#089f83' },
  { key: 'teal', label: '青碧', color: '#0896ac' },
  { key: 'blue', label: '靛蓝', color: '#2456e8' },
  { key: 'indigo', label: '蓝紫', color: '#5546d7' },
  { key: 'violet', label: '紫罗兰', color: '#933fdb' },
  { key: 'pink', label: '桃粉', color: '#d64087' },
  { key: 'coral', label: '珊瑚', color: '#e45f4a' },
  { key: 'amber', label: '琥珀', color: '#c68a13' },
  { key: 'slate', label: '石板', color: '#526174' },
  { key: 'cinnabar', label: '朱砂', color: '#b7352d' },
  { key: 'bamboo', label: '竹青', color: '#4c8c4a' },
  { key: 'ochre', label: '赭石', color: '#9a6b2f' },
  { key: 'lotus', label: '莲华', color: '#a34f8c' },
];

const BACKGROUNDS = [
  { key: 'none', label: '纯色' },
  { key: 'blue-preview', label: '蓝色预览' },
  { key: 'ripples', label: '水波光斑' },
];

const CORNERS = [
  { key: 'squircle', label: '圆角方形' },
  { key: 'square', label: '直角' },
  { key: 'round', label: '正圆' },
];

interface GlazeSettings {
  palette: string;
  scheme: string;
  background: string;
  corners: string;
  contentWidth: string;
}

const initial: GlazeSettings = {
  palette: 'green',
  scheme: 'light',
  background: 'blue-preview',
  corners: 'squircle',
  contentWidth: '600',
};

export default function GlazeSettings() {
  const [settings, setSettings] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    optionsApi
      .list()
      .then((response: any) => {
        const options = response.data || response;
        setSettings({
          palette: String(options.glaze_palette || 'green'),
          scheme: String(options.glaze_scheme || 'light'),
          background: String(options.glaze_background || 'none'),
          corners: String(options.glaze_corners || 'squircle'),
          contentWidth: String(options.glaze_content_width || '600'),
        });
      })
      .catch(() => toast.error('加载 Glaze 设置失败'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await optionsApi.updateMany({
        glaze_palette: settings.palette,
        glaze_scheme: settings.scheme,
        glaze_background: settings.background,
        glaze_corners: settings.corners,
        glaze_content_width: String(Number(settings.contentWidth) || 600),
      });
      toast.success('Glaze 设置已保存，刷新前台生效');
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
        <h3 className="m-0 text-sm font-semibold text-foreground">配色</h3>
        <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
          配色决定主题的主色、链接色与边框色。访客在前台配色器里的选择会覆盖这里的默认值。
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label>主题配色</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PALETTES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, palette: item.key }))}
                  className={`flex items-center gap-2 border px-3 py-2 text-xs transition-colors ${
                    settings.palette === item.key
                      ? 'border-primary text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={settings.palette === item.key}
                >
                  <span
                    className="inline-block size-3.5 rounded-full"
                    style={{ background: item.color }}
                    aria-hidden="true"
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="glaze-scheme">默认深浅色</Label>
              <select
                id="glaze-scheme"
                value={settings.scheme}
                onChange={(event) => setSettings((current) => ({ ...current, scheme: event.target.value }))}
                className="h-10 w-full border border-border bg-transparent px-3 text-sm"
              >
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="glaze-background">背景效果</Label>
              <select
                id="glaze-background"
                value={settings.background}
                onChange={(event) => setSettings((current) => ({ ...current, background: event.target.value }))}
                className="h-10 w-full border border-border bg-transparent px-3 text-sm"
              >
                {BACKGROUNDS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="m-0 text-sm font-semibold text-foreground">版式</h3>
        <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
          内容宽度是正文栏的最大宽度（px），窄栏更适合阅读，宽栏更适合长图与代码。
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="glaze-corners">圆角模式</Label>
            <select
              id="glaze-corners"
              value={settings.corners}
              onChange={(event) => setSettings((current) => ({ ...current, corners: event.target.value }))}
              className="h-10 w-full border border-border bg-transparent px-3 text-sm"
            >
              {CORNERS.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="glaze-content-width">内容宽度（px）</Label>
            <Input
              id="glaze-content-width"
              type="number"
              min={360}
              max={1600}
              step={20}
              value={settings.contentWidth}
              onChange={(event) => setSettings((current) => ({ ...current, contentWidth: event.target.value }))}
            />
            <p className="m-0 text-xs text-muted-foreground">取值范围 360–1600，默认 600。</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存设置'}</Button>
      </div>
    </div>
  );
}
