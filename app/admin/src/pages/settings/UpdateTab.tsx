/**
 * 设置页「系统更新」tab。
 *
 * 从 Settings.tsx 抽出来的纯展示壳：真正的版本比对、下载、升级流程都在
 * SystemUpdatePanel 里，这里只负责标题、说明和「其它升级方式」那块提示。
 *
 * 这个 tab 是只读的 —— 没有任何表单字段，所以不需要 register / watch /
 * setValue，保存按钮在 Settings.tsx 里也是被 `activeTab !== 'update'` 挡掉的。
 */

import { CloudDownload, Info } from 'lucide-react';
import type { useI18n } from '@/lib/i18n';
import SystemUpdatePanel from '@/components/SystemUpdatePanel';

export default function UpdateTab({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <>
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs-plus font-semibold tracking-wide text-foreground">
          <CloudDownload className="size-4 text-primary" />
          {t('admin.settings.update.section', '系统更新')}
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {t('admin.settings.update.description', 'Utterlog 通过 GitHub Releases 推送新版本。下方会实时比对你当前运行的版本和最新发布；有新版本时点「一键升级」即可。升级过程保留所有数据、配置和用户上传。')}
        </p>
        <SystemUpdatePanel />
        <div className="mt-6 border border-border bg-muted px-4 py-3.5 text-xs leading-loose text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
            <Info className="size-3.5" />
            {t('admin.settings.update.otherMethods', '其它升级方式')}
          </div>
          · {t('admin.settings.update.commandLine', '命令行')}：<code className="border border-border bg-card px-1.5 py-px font-mono text-2xs">curl -fsSL https://utterlog.io/update.sh | bash</code>
          <br />
          · {t('admin.settings.update.changelog', '历史版本')}：<a href="https://utterlog.io/changelog" target="_blank" rel="noopener" className="text-primary">utterlog.io/changelog</a>
          <br />
          · {t('admin.settings.update.docs', '文档')}：<a href="https://docs.utterlog.io/update/" target="_blank" rel="noopener" className="text-primary">docs.utterlog.io/update</a>
        </div>
      </div>
    </>
  );
}
