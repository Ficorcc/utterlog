/**
 * 设置页「邮件」tab。
 *
 * 从 Settings.tsx 搬出来的 JSX —— register()/watch() 的字段名与原来一字不差，
 * 改动任何一个都会让保存时那个字段悄悄从 payload 里消失。
 *
 * 每个设置项走 shared.tsx 的 Row 系列（左标签 32% + 右控件），原先手写的
 * 「上下堆叠」和 grid-cols-2 并排都拆成了独立的一行，跟其它 tab 对齐。
 *
 * emailProvider 原先在 Settings.tsx 顶层用 watch('email_provider', 'smtp')
 * 取，现在改成在本组件内用传进来的 watch 取：语义相同，但订阅收敛到这个
 * tab，切换服务商时不再触发整页重渲染。
 */

import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui/shadcn';
import { AtSign, Mail, Send, Bird, ExternalLink } from 'lucide-react';
import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { InputRow, Panel, RadioCardRow, SelectRow, SettingsSection } from './shared';

export default function EmailTab({ t, register, watch }: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
}) {
  const emailProvider = watch('email_provider', 'smtp');

  return (
    <>
      <SettingsSection title={t('admin.settings.email.sender.section', '发件人信息')} icon={AtSign}>
        <InputRow
          label={t('admin.settings.email.sender.email', '发件人邮箱')}
          placeholder="noreply@yourdomain.com"
          register={register('email_from')}
        />
        <InputRow
          label={t('admin.settings.email.sender.name', '发件人名称')}
          placeholder="Utterlog"
          register={register('email_from_name')}
          last
        />
      </SettingsSection>

      <Panel title={t('admin.settings.email.provider.section', '邮件服务商')}>
        <RadioCardRow
          className="mb-6"
          label={t('admin.settings.email.provider.choose', '选择服务商')}
          value={emailProvider}
          register={register('email_provider')}
          options={[
            { value: 'smtp', label: 'SMTP', icon: Mail, desc: t('admin.settings.email.provider.smtpDesc', '通用 SMTP 协议') },
            { value: 'resend', label: 'Resend', icon: Send, desc: t('admin.settings.email.provider.resendDesc', '免费 3000 封/月') },
            { value: 'sendflare', label: 'Sendflare', icon: Bird, desc: t('admin.settings.email.provider.sendflareDesc', '免费 5000 封/月') },
          ]}
        />

        {emailProvider === 'smtp' && (
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{t('admin.settings.email.smtp.section', 'SMTP 配置')}</h4>
              </div>
              <a href="https://support.google.com/a/answer/176600" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground no-underline hover:text-foreground">
                <ExternalLink className="size-2.5" /> {t('admin.settings.email.smtp.gmailGuide', 'Gmail SMTP 指南')}
              </a>
            </div>
            <InputRow
              label={t('admin.settings.email.smtp.host', 'SMTP 主机')}
              placeholder="smtp.gmail.com"
              register={register('smtp_host')}
            />
            <InputRow
              label={t('admin.settings.email.smtp.port', '端口')}
              placeholder="587"
              register={register('smtp_port')}
            />
            <InputRow
              label={t('admin.settings.email.smtp.username', '用户名')}
              register={register('smtp_user')}
            />
            <InputRow
              label={t('admin.settings.email.smtp.password', '密码')}
              type="password"
              register={register('smtp_pass')}
            />
            <SelectRow
              label={t('admin.settings.email.smtp.encryption', '加密方式')}
              register={register('smtp_encryption')}
              options={[
                { value: 'tls', label: 'TLS' },
                { value: 'ssl', label: 'SSL' },
                { value: 'none', label: t('admin.settings.email.smtp.noEncryption', '无加密') },
              ]}
              last
            />
          </div>
        )}

        {emailProvider === 'resend' && (
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Send className="size-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{t('admin.settings.email.resend.section', 'Resend 配置')}</h4>
              </div>
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground no-underline hover:text-foreground">
                <ExternalLink className="size-2.5" /> resend.com
              </a>
            </div>
            <InputRow
              label="API Key"
              hint={t('admin.settings.email.resend.apiKeyHint', '在 resend.com Dashboard 的 API Keys 中创建')}
              type="password"
              placeholder="re_..."
              register={register('resend_api_key')}
              last
            />
          </div>
        )}

        {emailProvider === 'sendflare' && (
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Bird className="size-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{t('admin.settings.email.sendflare.section', 'Sendflare 配置')}</h4>
              </div>
              <a href="https://sendflare.com?affiliateCode=98ee3f7h4nqf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground no-underline hover:text-foreground">
                <ExternalLink className="size-2.5" /> sendflare.com
              </a>
            </div>
            <InputRow
              label="API Key"
              hint={t('admin.settings.email.sendflare.apiKeyHint', '在 sendflare.com Dashboard 的 API Keys 中创建')}
              type="password"
              placeholder="sf_..."
              register={register('sendflare_api_key')}
              last
            />
          </div>
        )}
      </Panel>

      <Panel
        title={t('admin.settings.email.test.section', '测试邮件')}
        description={t('admin.settings.email.test.description', '保存设置后发送测试邮件，验证邮件服务是否正常')}
      >
        <div className="flex items-center gap-2.5">
          <Input
            placeholder={t('admin.settings.email.test.recipientPlaceholder', '收件邮箱（留空发送到管理员邮箱）')}
            className="max-w-80"
            id="test-email-input"
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={async () => {
              const input = document.getElementById('test-email-input') as HTMLInputElement;
              try {
                const r: any = await api.post('/options/test-email', { to: input?.value || '' });
                toast.success(r.data?.message || t('admin.settings.email.test.sent', '测试邮件已发送'));
              } catch (e: any) {
                toast.error(e?.response?.data?.error?.message || t('admin.common.sendFailed', '发送失败'));
              }
            }}
          >
            <Send /> {t('admin.common.send', '发送')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
