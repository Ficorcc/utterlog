import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { optionsApi } from '@/lib/api';
import { Button, Card, LoadingState, Switch } from '@/components/ui/shadcn';

const OPTION_KEY = 'shanying_jieqi_enabled';

export default function ShanYingJieqiSettings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    optionsApi.list()
      .then((response: any) => {
        const options = response.data || response;
        setEnabled(options[OPTION_KEY] !== 'false');
      })
      .catch(() => toast.error('加载节气提醒设置失败'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await optionsApi.updateMany({ [OPTION_KEY]: String(enabled) });
      toast.success('节气提醒设置已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState className="py-5" />;

  return (
    <Card className="mt-6 p-5">
      <div className="flex items-center justify-between gap-5">
        <div>
          <h3 className="m-0 text-sm font-semibold text-foreground">节气与节假日弹窗</h3>
          <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
            在节气或中国节假日期间显示“节期来信”，包含节日介绍、农历日期、假期和补班信息。访客关闭后，同一节日不会反复自动弹出。
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="启用节气与节假日弹窗" />
      </div>
      <div className="mt-5 flex justify-end border-t border-border pt-4">
        <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存设置'}</Button>
      </div>
    </Card>
  );
}
