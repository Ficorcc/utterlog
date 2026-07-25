/**
 * 设置页「邮件」tab。
 *
 * 从 Settings.tsx 里原样搬出来的 JSX —— register()/watch() 的字段名与原来
 * 一字不差，改动任何一个都会让保存时那个字段悄悄从 payload 里消失。
 *
 * emailProvider 原先在 Settings.tsx 顶层用 watch('email_provider', 'smtp')
 * 取，现在改成在本组件内用传进来的 watch 取：语义相同，但订阅收敛到这个
 * tab，切换服务商时不再触发整页重渲染。
 */

import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui/shadcn';
import { Mail, Send, Bird, ExternalLink } from 'lucide-react';
import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Panel, SELECT_CLS } from './shared';

export default function EmailTab({ t, register, watch }: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
}) {
  const emailProvider = watch('email_provider', 'smtp');

  return (
    <>
      <Panel title={t('admin.settings.email.sender.section', '发件人信息')}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-1.5">
            <label className="text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.sender.email', '发件人邮箱')}</label>
            <Input placeholder="noreply@yourdomain.com" {...register('email_from')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.sender.name', '发件人名称')}</label>
            <Input placeholder="Utterlog" {...register('email_from_name')} />
          </div>
        </div>
      </Panel>

      <Panel title={t('admin.settings.email.provider.section', '邮件服务商')}>
        <div className="mb-6">
          <label className="mb-2 block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.provider.choose', '选择服务商')}</label>
          <div className="flex gap-2.5">
            {([
              { value: 'smtp', label: 'SMTP', icon: Mail, desc: t('admin.settings.email.provider.smtpDesc', '通用 SMTP 协议') },
              { value: 'resend', label: 'Resend', icon: Send, desc: t('admin.settings.email.provider.resendDesc', '免费 3000 封/月') },
              { value: 'sendflare', label: 'Sendflare', icon: Bird, desc: t('admin.settings.email.provider.sendflareDesc', '免费 5000 封/月') },
            ]).map(d => {
              const Icon = d.icon;
              const active = emailProvider === d.value;
              return (
                <label key={d.value} className={cn(
                  'flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-md border p-4 transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
                )}>
                  <input type="radio" value={d.value} {...register('email_provider')} className="hidden" />
                  <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-xs-plus font-semibold', active ? 'text-primary' : 'text-foreground')}>{d.label}</span>
                  <span className="text-2xs text-muted-foreground">{d.desc}</span>
                </label>
              );
            })}
          </div>
        </div>

        {emailProvider === 'smtp' && (
          <div className="flex flex-col gap-5 rounded-md border border-border bg-muted p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="size-3.75 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{t('admin.settings.email.smtp.section', 'SMTP 配置')}</h4>
              </div>
              <a href="https://support.google.com/a/answer/176600" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground no-underline hover:text-foreground">
                <ExternalLink className="size-2.5" /> {t('admin.settings.email.smtp.gmailGuide', 'Gmail SMTP 指南')}
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.smtp.host', 'SMTP 主机')}</label>
                <Input {...register('smtp_host')} placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.smtp.port', '端口')}</label>
                <Input {...register('smtp_port')} placeholder="587" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.smtp.username', '用户名')}</label>
                <Input {...register('smtp_user')} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.smtp.password', '密码')}</label>
                <Input type="password" {...register('smtp_pass')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.email.smtp.encryption', '加密方式')}</label>
              <select className={cn(SELECT_CLS, 'max-w-50')} {...register('smtp_encryption')}>
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">{t('admin.settings.email.smtp.noEncryption', '无加密')}</option>
              </select>
            </div>
          </div>
        )}

        {emailProvider === 'resend' && (
          <div className="flex flex-col gap-5 rounded-md border border-border bg-muted p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="size-3.75 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{t('admin.settings.email.resend.section', 'Resend 配置')}</h4>
              </div>
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground no-underline hover:text-foreground">
                <ExternalLink className="size-2.5" /> resend.com
              </a>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs-plus font-medium text-muted-foreground">API Key</label>
              <Input type="password" {...register('resend_api_key')} placeholder="re_..." />
              <p className="text-xs text-muted-foreground">{t('admin.settings.email.resend.apiKeyHint', '在 resend.com Dashboard 的 API Keys 中创建')}</p>
            </div>
          </div>
        )}

        {emailProvider === 'sendflare' && (
          <div className="flex flex-col gap-5 rounded-md border border-border bg-muted p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bird className="size-3.75 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{t('admin.settings.email.sendflare.section', 'Sendflare 配置')}</h4>
              </div>
              <a href="https://sendflare.com?affiliateCode=98ee3f7h4nqf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground no-underline hover:text-foreground">
                <ExternalLink className="size-2.5" /> sendflare.com
              </a>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs-plus font-medium text-muted-foreground">API Key</label>
              <Input type="password" {...register('sendflare_api_key')} placeholder="sf_..." />
              <p className="text-xs text-muted-foreground">{t('admin.settings.email.sendflare.apiKeyHint', '在 sendflare.com Dashboard 的 API Keys 中创建')}</p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title={t('admin.settings.email.test.section', '测试邮件')}>
        <p className="-mt-4 mb-4 text-xs text-muted-foreground">{t('admin.settings.email.test.description', '保存设置后发送测试邮件，验证邮件服务是否正常')}</p>
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
            <Send className="size-3.5" /> {t('admin.common.send', '发送')}
          </Button>
        </div>
      </Panel>
    </>
  );
}
