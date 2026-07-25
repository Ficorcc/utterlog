/**
 * 「常规设置」tab。
 *
 * 从 Settings.tsx 搬出来 —— 原先九个 tab 的 JSX 挤在同一个函数体里，
 * 切 tab 时整页重新执行。这里只负责渲染，表单状态仍由父组件的
 * react-hook-form 实例持有，通过 register / watch 传进来。
 */

import type { ChangeEvent } from 'react';
import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/shadcn';
import {
  Code, Image as ImageIcon, Info, Shield, CloudUpload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useI18n } from '@/lib/i18n';
import { TimezoneCombobox } from '@/components/TimezoneCombobox';
import {
  BrandingPreview,
  InputRow,
  RadioRow,
  Row,
  SelectRow,
  SettingsSection,
  TextareaRow,
} from './shared';

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * Logo / Favicon 预览。
 * 之前是裸 <img onError={display:none}>，加载失败容器一片空白
 * （ternary 是 val? img : icon，img 加载失败被 hide 掉但 icon
 * 已经因为 val 非空被跳过）。这里抽出来用 useState 跟踪错误，
 * 失败时降级到图标占位 + 提示文字，让用户看到「图片加载失败」
 * 而不是空白以为没存上。
 *
 * 父组件用 key={val} 在路径变化时重新挂载本组件，error state
 * 自动重置 —— 用户改完路径或重新上传就会立即重新尝试加载。
 */
export function brandingPreviewSrc(field: string, value: string) {
  const val = (value || '').trim();
  if (field === 'site_favicon' && /^\/favicon\.[a-z0-9]+$/i.test(val) && val !== '/favicon.ico') {
    return '/favicon.ico';
  }
  return val;
}

export type LocaleOption = {
  locale: string;
  name: string;
  native_name: string;
  source?: string;
};

export default function GeneralTab({
  t,
  register,
  watch,
  locales,
  effectiveSiteTimezone,
  handleBrandingUpload,
}: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  locales: LocaleOption[];
  effectiveSiteTimezone: string;
  handleBrandingUpload: (
    e: ChangeEvent<HTMLInputElement>,
    purpose: 'logo' | 'dark-logo' | 'favicon',
    field: string,
  ) => void;
}) {
  return (
    <>
      <SettingsSection title={t('admin.settings.general.section', '站点基础信息')} icon={Info}>
        <InputRow label={t('admin.settings.general.siteTitle', '站点名称')} register={register('site_title')} placeholder={t('admin.settings.general.siteTitlePlaceholder', '我的博客')} />
        <RadioRow
          label={t('admin.settings.general.brandMode', '标题显示方式')}
          hint={t('admin.settings.general.brandModeHint', 'Header 处显示文字、Logo 或两者；支持响应站点标题设置的主题')}
          register={register('site_brand_mode')}
          options={[
            { value: 'text', label: t('admin.settings.general.brandText', '文字') },
            { value: 'text_logo', label: t('admin.settings.general.brandTextLogo', '文字 + Logo') },
            { value: 'logo', label: 'Logo' },
          ]}
        />
        <InputRow label={t('admin.settings.general.subtitle', '副标题')} register={register('site_subtitle')} placeholder={t('admin.settings.general.subtitlePlaceholder', '一句话 Slogan')} />
        <SelectRow
          label={t('admin.settings.general.siteLanguage', '站点语言')}
          hint={t('admin.settings.general.siteLanguageHint', '读取内置语言包和安装目录 locales/*.json；影响前台 lang、RSS 和后台界面翻译')}
          register={register('site_locale')}
          options={locales.map((loc) => ({
            value: loc.locale,
            label: `${loc.native_name || loc.name || loc.locale} (${loc.locale})${loc.source === 'external' ? ` · ${t('admin.settings.general.customLanguagePack', '自定义')}` : ''}`,
          }))}
        />
        {/* 站点时区 —— input + datalist 组合：可下拉选 60+ 主要城市
            （label 显示 "城市 · UTC±N · IANA"），也可直接键入任意
            合法 IANA 名。后端 siteclock.IsValid 兜底校验，无效保持
            原值不写入。留空 → 走自动识别（os env TZ → 浏览器 → UTC）。*/}
        <Row
          label={t('admin.settings.general.siteTimezone', '站点时区')}
          hint={t('admin.settings.general.siteTimezoneHint', '全站发布时间、归档和统计按此时区显示；留空自动使用本地时区。当前生效：{timezone}', { timezone: effectiveSiteTimezone || browserTimeZone() || 'UTC' })}
        >
          <TimezoneCombobox register={register('site_timezone')} />
        </Row>
        <InputRow label={t('admin.settings.general.siteUrl', '站点网址')} register={register('site_url')} placeholder="https://yourdomain.com" />
        <InputRow label={t('admin.settings.general.adminEmail', '管理员邮箱')} type="email" register={register('admin_email')} placeholder="admin@yourdomain.com" hint={t('admin.settings.general.adminEmailHint', '接收系统升级、安全通知等消息')} />
        <InputRow label={t('admin.settings.general.siteSince', '建站时间')} type="date" register={register('site_since')} hint={t('admin.settings.general.siteSinceHint', '留空则从第一篇文章算起。站点描述和关键词请到 SEO 与 AI tab 设置。')} last />
      </SettingsSection>

      <SettingsSection title={t('admin.settings.branding.section', 'Logo & Favicon')} icon={ImageIcon} footerHint={t('admin.settings.branding.footer', 'Logo 与深色 Logo 自动按比例压缩到 512×512 以内并转为 WebP；Favicon 自动生成多尺寸 /favicon.ico。')}>
        <div className="grid grid-cols-3 gap-4 p-4">
          {([
            { label: t('admin.settings.branding.siteLogo', '网站 Logo'), field: 'site_logo', purpose: 'logo' as const, placeholder: 'https://...' },
            { label: t('admin.settings.branding.darkLogo', '深色模式 Logo'), field: 'site_logo_dark', purpose: 'dark-logo' as const, placeholder: t('admin.settings.branding.darkLogoPlaceholder', '留空沿用默认') },
            { label: 'Favicon', field: 'site_favicon', purpose: 'favicon' as const, placeholder: '/favicon.ico' },
          ]).map(item => {
            const val = watch(item.field);
            return (
              <div key={item.field} className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">{item.label}</label>
                <div className={cn(
                  'flex h-20 items-center justify-center overflow-hidden rounded-md border border-border',
                  item.purpose === 'dark-logo' ? 'bg-neutral-900' : 'bg-muted',
                )}>
                  {/* key={val} 让路径变化时强制重渲染子组件，
                      清掉上一次的 error state；这样上传失败 →
                      修正路径 → 重新加载会自动恢复，不会卡在
                      老的"加载失败"占位上。 */}
                  <BrandingPreview key={`${item.field}:${val}`} src={brandingPreviewSrc(item.field, val)} alt={item.label} />
                </div>
                <div className="flex gap-1.5">
                  <Input className="min-w-0 flex-1 text-xs" placeholder={item.placeholder} {...register(item.field)} />
                  <label
                    className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
                    title={t('admin.common.uploadImage', '上传图片')}
                  >
                    <CloudUpload className="size-3.5" />
                    <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.avif,.ico,.svg" className="hidden" onChange={(e) => handleBrandingUpload(e, item.purpose, item.field)} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('admin.settings.beian.section', 'ICP / 公安备案')}
        icon={Shield}
        footerHint={t('admin.settings.beian.footer', '公安备案链接自动从备案号提取编号生成；ICP 备案链接固定指向 beian.miit.gov.cn。')}
      >
        <InputRow
          label={t('admin.settings.beian.gongan', '公安联网备案号')}
          register={register('beian_gongan')}
          placeholder={t('admin.settings.beian.gonganPlaceholder', '鲁公网安备00000000000000号')}
        />
        <InputRow
          label={t('admin.settings.beian.icp', 'ICP 备案号')}
          register={register('beian_icp')}
          placeholder={t('admin.settings.beian.icpPlaceholder', '鲁ICP备00000000号')}
          last
        />
      </SettingsSection>

      <SettingsSection
        title={t('admin.settings.codeInjection.section', '代码注入')}
        icon={Code}
        footerHint={t('admin.settings.codeInjection.footer', '插入到页面 <head> 标签内，用于接入第三方统计 / 监控 / 验证脚本。请只填可信来源的代码。')}
      >
        <TextareaRow
          label={t('admin.settings.codeInjection.headCode', '自定义 <head> 代码')}
          rows={6}
          register={register('custom_head_code')}
          placeholder={t('admin.settings.codeInjection.headCodePlaceholder', '<!-- Google Analytics / 百度统计 / Clarity 等 -->\n<script async src="https://..."></script>')}
          hint={t('admin.settings.codeInjection.headCodeHint', '支持任意 <script> / <meta> / <link> 标签。保存后立即生效。')}
          last
        />
      </SettingsSection>
    </>
  );
}
