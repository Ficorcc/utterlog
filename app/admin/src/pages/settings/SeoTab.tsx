/**
 * 设置页「SEO 与 AI」tab。
 *
 * 从 Settings.tsx 抽出来 —— 原先整页挤在一个函数里，切 tab 时整个函数体
 * 重新执行。JSX 原样搬运，字段名一字未改。
 */

import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Bot, Tag, AtSign } from 'lucide-react';
import type { useI18n } from '@/lib/i18n';
import {
  SettingsSection, InputRow, SelectRow, TextareaRow, SwitchRow,
} from './shared';

export default function SeoTab({ t, register, watch, setValue }: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}) {
  return (
    <>
      <SettingsSection
        title={t('admin.settings.seo.aiCrawl.section', 'AI 抓取策略')}
        icon={Bot}
        footerHint={t('admin.settings.seo.aiCrawl.footer', '生成的 /robots.txt 会按这些选项设置 GPTBot / ClaudeBot / CCBot / PerplexityBot / Google-Extended 的 Allow / Disallow。')}
      >
        <SwitchRow
          label={t('admin.settings.seo.aiCrawl.allow', '允许 AI 爬虫读取站点')}
          hint={t('admin.settings.seo.aiCrawl.allowHint', '关闭后 robots.txt 会拒绝所有 AI 训练爬虫；普通搜索引擎不受影响。')}
          name="ai_crawl_allowed" watch={watch} setValue={setValue}
        />
        <SwitchRow
          label={t('admin.settings.seo.aiCrawl.llmsTxt', '生成 /llms.txt 站点索引')}
          hint={t('admin.settings.seo.aiCrawl.llmsTxtHint', 'LLM 友好的 markdown 索引（标题 + 描述 + 文章列表），是 llmstxt.org 提议的新规范。')}
          name="llms_txt_enabled" watch={watch} setValue={setValue}
        />
        <SwitchRow
          label={t('admin.settings.seo.aiCrawl.llmsFull', '生成 /llms-full.txt 全文版')}
          hint={t('admin.settings.seo.aiCrawl.llmsFullHint', '包含每篇文章 markdown 全文，体积更大；建议同时开启 ai_crawl_allowed 才有意义。')}
          name="llms_full_enabled" watch={watch} setValue={setValue}
          last
        />
      </SettingsSection>

      <SettingsSection
        title={t('admin.settings.seo.meta.section', '默认 SEO 元信息')}
        icon={Tag}
        footerHint={t('admin.settings.seo.meta.footer', '单篇文章未自定时使用这些值；文章自带的 cover_url / excerpt 会优先生效。')}
      >
        <TextareaRow
          label={t('admin.settings.seo.meta.description', '默认描述')}
          rows={2}
          register={register('seo_default_description')}
          placeholder={t('admin.settings.seo.meta.descriptionPlaceholder', '一句话描述站点 - 用作 meta description / og:description 兜底')}
        />
        <InputRow
          label={t('admin.settings.seo.meta.keywords', '默认关键词')}
          register={register('seo_default_keywords')}
          placeholder={t('admin.settings.seo.meta.keywordsPlaceholder', '博客,技术,生活')}
        />
        <InputRow
          label={t('admin.settings.seo.meta.defaultImage', '默认分享图 URL')}
          register={register('seo_default_image')}
          placeholder="https://yourdomain.com/og-image.jpg"
          hint={t('admin.settings.seo.meta.defaultImageHint', '建议 1200x630。X / Facebook / 微信卡片图兜底。')}
          last
        />
      </SettingsSection>

      <SettingsSection
        title={t('admin.settings.seo.twitter.section', 'X (Twitter) 卡片')}
        icon={AtSign}
      >
        <InputRow
          label={t('admin.settings.seo.twitter.handle', 'X 用户名')}
          register={register('seo_twitter_handle')}
          placeholder="@yourhandle"
          hint={t('admin.settings.seo.twitter.handleHint', '带 @ 前缀；用于 twitter:site 标签。')}
        />
        <SelectRow
          label={t('admin.settings.seo.twitter.card', '卡片样式')}
          register={register('seo_twitter_card')}
          options={[
            { value: 'summary_large_image', label: t('admin.settings.seo.twitter.largeCard', '大图卡片 - summary_large_image (推荐)') },
            { value: 'summary', label: t('admin.settings.seo.twitter.summaryCard', '小图卡片 - summary') },
          ]}
          last
        />
      </SettingsSection>
    </>
  );
}
