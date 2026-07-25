/**
 * 评论设置 tab。
 *
 * 从 Settings.tsx 里 `activeTab === 'comment'` 那段整体搬过来 —— JSX 一字未改，
 * 只是换了个落脚点，好让切 tab 时不再重跑整页那个函数体。
 */

import { MessagesSquare, ArrowDownWideNarrow, Shield, ShieldCheck, Bot } from 'lucide-react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SettingsSection, InputRow, SelectRow, RadioRow, SwitchRow } from './shared';

export default function CommentTab({ t, register, watch, setValue }: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}) {
  return (
    <>
      <SettingsSection title={t('admin.settings.comment.switches.section', '评论开关')} icon={MessagesSquare}>
        <SwitchRow label={t('admin.settings.comment.switches.allowComments', '允许评论')} name="allow_comments" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.comment.switches.requireModeration', '评论需要审核')} name="comment_moderation" watch={watch} setValue={setValue} />
        <SwitchRow
          label={t('admin.settings.comment.switches.trustReturning', '信任历史访客')}
          hint={t('admin.settings.comment.switches.trustReturningHint', '评论者邮箱或浏览器指纹之前有过通过的评论，自动通过审核')}
          name="comment_trust_returning" watch={watch} setValue={setValue}
        />
        <SwitchRow label={t('admin.settings.comment.switches.requireEmail', '评论需要填写邮箱')} name="comment_require_email" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.comment.switches.notifyAdmin', '新评论邮件通知管理员')} name="comment_notify_admin" watch={watch} setValue={setValue} last />
      </SettingsSection>

      <SettingsSection title={t('admin.settings.comment.order.section', '排序')} icon={ArrowDownWideNarrow} footerHint={t('admin.settings.comment.order.footer', '访客在评论区可以自行切换并存到本地，这里设的是没切换过时的初始顺序。')}>
        <RadioRow
          label={t('admin.settings.comment.order.defaultOrder', '默认排序')}
          hint={t('admin.settings.comment.order.defaultOrderHint', '访客首次进入评论区的初始顺序')}
          register={register('comment_order')}
          options={[
            { value: 'newest', label: t('admin.settings.comment.order.newestFirst', '最新在前') },
            { value: 'oldest', label: t('admin.settings.comment.order.oldestFirst', '最早在前') },
          ]}
          last
        />
      </SettingsSection>

      {/* 人机验证：保留自定义 3 列图标 radio 卡片（非表单式 UI），
          只把子输入转成 InputRow 保持风格一致 */}
      <SettingsSection title={t('admin.settings.comment.captcha.section', '人机验证')} icon={Shield}>
        <div className={cn('px-3.5 pb-2.5 pt-3.5', watch('comment_captcha_mode') === 'pow' && 'border-b border-border')}>
          <div className="mb-2.5 text-sm font-medium text-foreground">{t('admin.settings.comment.captcha.method', '验证方式')}</div>
          <div className="flex gap-2.5">
            {([
              { value: 'off', label: t('admin.common.off', '关闭'), desc: t('admin.settings.comment.captcha.offDesc', '不验证') },
              { value: 'pow', label: t('admin.settings.comment.captcha.pow', 'PoW 验证'), desc: t('admin.settings.comment.captcha.powDesc', '点击计算') },
              { value: 'image', label: t('admin.settings.comment.captcha.image', '图片验证码'), desc: t('admin.settings.comment.captcha.imageDesc', '输入字符') },
            ] as const).map(opt => {
              const active = watch('comment_captcha_mode') === opt.value;
              return (
                <label key={opt.value} className={cn(
                  'flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-md border px-2 py-3 transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
                )}>
                  <input type="radio" value={opt.value} {...register('comment_captcha_mode')} className="hidden" />
                  <span className={cn('text-xs-plus font-semibold', active ? 'text-primary' : 'text-foreground')}>{opt.label}</span>
                  <span className="text-2xs text-muted-foreground">{opt.desc}</span>
                </label>
              );
            })}
          </div>
        </div>
        {watch('comment_captcha_mode') === 'pow' && (
          <InputRow
            label={t('admin.settings.comment.captcha.difficulty', '验证难度')}
            hint={t('admin.settings.comment.captcha.difficultyHint', '1-6，越大越难')}
            type="number"
            register={register('comment_captcha_difficulty')}
            last
          />
        )}
      </SettingsSection>

      {/* AI 评论审核 —— 复用全局 ai_providers，admin 可在「常规设置 →
          AI → 用途路由」给 'comment-audit' purpose 单独绑 provider，
          也可不绑自动 fallback 默认链。 */}
      <SettingsSection title={t('admin.settings.comment.aiAudit.section', 'AI 评论审核')} icon={ShieldCheck} footerHint={t('admin.settings.comment.aiAudit.footer', '启用后访客评论先经 AI 判断是否合规，再走原有人机验证 / 信任路径。AI 审核失败按下方策略处理，提示词在最下方「自定义提示词」可改。')}>
        <SwitchRow label={t('admin.settings.comment.aiAudit.enable', '启用 AI 审核')} name="ai_comment_audit_enabled" watch={watch} setValue={setValue} />
        <InputRow
          label={t('admin.settings.comment.aiAudit.threshold', '审核阈值')}
          hint={t('admin.settings.comment.aiAudit.thresholdHint', '0-1 之间。AI 返回的 confidence >= 阈值才算通过，越高越严格')}
          type="number"
          register={register('ai_comment_audit_threshold')}
        />
        <SelectRow
          label={t('admin.settings.comment.aiAudit.failAction', '审核失败处理')}
          register={register('ai_comment_audit_fail_action')}
          options={[
            { value: 'reject', label: t('admin.settings.comment.aiAudit.reject', '直接拦截（标记为垃圾）') },
            { value: 'pending', label: t('admin.settings.comment.aiAudit.pending', '转人工审核（待审核队列）') },
            { value: 'ignore', label: t('admin.settings.comment.aiAudit.ignore', '忽略（继续按原状态处理）') },
          ]}
          last
        />
      </SettingsSection>

      {/* AI 智能回复 —— 用 ai_purpose_comment-reply_provider 路由。
          审核通过的评论异步生成回复入队列，按 mode 决定后续流程。 */}
      <SettingsSection title={t('admin.settings.comment.aiReply.section', 'AI 智能回复')} icon={Bot} footerHint={t('admin.settings.comment.aiReply.footer', '审核通过的评论自动调 AI 生成回复。auto 模式直接发布，audit 模式入队列等管理员审核（推荐），suggest 仅显示建议不发布。提示词在最下方「自定义提示词」可改。')}>
        <SwitchRow label={t('admin.settings.comment.aiReply.enable', '启用 AI 智能回复')} name="ai_comment_reply_enabled" watch={watch} setValue={setValue} />
        <SelectRow
          label={t('admin.settings.comment.aiReply.mode', '回复模式')}
          register={register('ai_comment_reply_mode')}
          options={[
            { value: 'audit', label: t('admin.settings.comment.aiReply.modeAudit', '人工审核模式（推荐）- 入队列等审核') },
            { value: 'auto', label: t('admin.settings.comment.aiReply.modeAuto', '全自动模式 - 生成后直接发布') },
            { value: 'suggest', label: t('admin.settings.comment.aiReply.modeSuggest', '仅建议模式 - 入队列但不发布') },
          ]}
        />
        <InputRow
          label={t('admin.settings.comment.aiReply.badgeText', 'AI 标识文本')}
          hint={t('admin.settings.comment.aiReply.badgeTextHint', '附加在 AI 回复末尾的标识，留空则不显示。透明性原则建议保留')}
          register={register('ai_comment_reply_badge_text')}
        />
        <InputRow
          label={t('admin.settings.comment.aiReply.rateLimit', '每小时调用上限')}
          hint={t('admin.settings.comment.aiReply.rateLimitHint', '防止 API 费用失控，0 为不限制')}
          type="number"
          register={register('ai_comment_reply_rate_limit')}
        />
        <InputRow
          label={t('admin.settings.comment.aiReply.delay', '回复延迟（秒）')}
          hint={t('admin.settings.comment.aiReply.delayHint', '审核通过后延迟多少秒再调 AI，0 为立即。建议 30-120 秒让回复更自然')}
          type="number"
          register={register('ai_comment_reply_delay')}
        />
        <SwitchRow
          label={t('admin.settings.comment.aiReply.contextTitle', '上下文：包含文章标题')}
          hint={t('admin.settings.comment.aiReply.contextTitleHint', '把当前文章标题传给 AI，回复更贴题')}
          name="ai_comment_reply_context_title" watch={watch} setValue={setValue}
        />
        <SwitchRow
          label={t('admin.settings.comment.aiReply.contextExcerpt', '上下文：包含文章摘要（前 300 字）')}
          name="ai_comment_reply_context_excerpt" watch={watch} setValue={setValue}
        />
        <SwitchRow
          label={t('admin.settings.comment.aiReply.contextParent', '上下文：包含父级评论')}
          hint={t('admin.settings.comment.aiReply.contextParentHint', '访客回复其他人评论时，把对方的评论传给 AI')}
          name="ai_comment_reply_context_parent" watch={watch} setValue={setValue}
        />
        <SwitchRow
          label={t('admin.settings.comment.aiReply.onlyFirst', '仅对文章首条评论回复')}
          hint={t('admin.settings.comment.aiReply.onlyFirstHint', '开启后同一文章 AI 只回复一次')}
          name="ai_comment_reply_only_first" watch={watch} setValue={setValue}
          last
        />
      </SettingsSection>
    </>
  );
}
