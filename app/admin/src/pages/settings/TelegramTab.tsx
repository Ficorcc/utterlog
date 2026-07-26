/**
 * 设置页 · Telegram tab。
 *
 * 从 Settings.tsx 里 `activeTab === 'telegram'` 那段整体搬过来的。
 * Bot 连接原先是手写的上下堆叠表单，已改回 shared.tsx 的 Row 系列，跟本页
 * 其它 section 一样是「左标签 + 右控件」的统一栅格。
 * Chat ID 的「获取」按钮要用父组件的 tgChats / fetchingChatId 局部 state，
 * 所以这两组 state 连同 setter 作为 prop 传进来。
 */

import type {
  UseFormRegister, UseFormWatch, UseFormSetValue, UseFormGetValues, UseFormReset,
} from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui/shadcn';
import {
  Search, Image as ImageIcon, Bell, UserCog, Bot,
  Loader2, Plug, Link as LinkIcon, Megaphone, Users, User,
} from 'lucide-react';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { InputRow, Row, SettingsSection, SwitchRow } from './shared';

export type TgChat = { id: string; type: string; name: string };

export default function TelegramTab({
  t, register, watch, setValue, getValues, reset,
  tgChats, setTgChats, fetchingChatId, setFetchingChatId,
}: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
  reset: UseFormReset<any>;
  tgChats: TgChat[];
  setTgChats: (chats: TgChat[]) => void;
  fetchingChatId: boolean;
  setFetchingChatId: (v: boolean) => void;
}) {
  return (
    <>
      <SettingsSection title={t('admin.settings.telegram.connection.section', 'Bot 连接')} icon={Bot}>
        <InputRow
          label="Bot Token"
          hint={<>{t('admin.settings.telegram.botFatherPrefix', '在 Telegram 中搜索')} <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary">@BotFather</a>{t('admin.settings.telegram.botFatherSuffix', '，发送 /newbot 创建')}</>}
          type="password"
          placeholder={t('admin.settings.telegram.botTokenPlaceholder', '从 @BotFather 获取')}
          register={register('telegram_bot_token')}
        />
        {/* 「获取」按钮和结果列表跟输入框是一件事，所以用 column 版 Row
            手工包：上面一行输入框 + 按钮，下面挂拉回来的会话列表。 */}
        <Row label="Chat ID" column>
          <div className="flex w-full items-center gap-2">
            <Input placeholder={t('admin.settings.telegram.chatIdPlaceholder', '你的用户/群组 ID')} className="min-w-0 flex-1" {...register('telegram_chat_id')} />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 whitespace-nowrap"
              disabled={fetchingChatId}
              onClick={async () => {
                setFetchingChatId(true);
                setTgChats([]);
                try {
                  const vals = getValues();
                  const r: any = await api.post('/telegram/get-chat-id', { bot_token: vals.telegram_bot_token });
                  setTgChats(r.data?.chats || []);
                  if (!r.data?.chats?.length) toast(r.data?.hint || t('admin.settings.telegram.noChats', '未找到聊天记录，请先向 Bot 发送一条消息'));
                } catch (e: any) { toast.error(e?.response?.data?.error?.message || t('admin.common.fetchFailed', '获取失败')); }
                finally { setFetchingChatId(false); }
              }}
            >
              {fetchingChatId ? <Loader2 className="animate-spin" /> : <Search />}
              {t('admin.common.fetch', '获取')}
            </Button>
          </div>
          {tgChats.length > 0 && (
            <div className="mt-1.5 overflow-hidden rounded-md border border-border">
              {tgChats.map((chat) => {
                const ChatIcon = chat.type === 'channel' ? Megaphone : (chat.type === 'group' || chat.type === 'supergroup') ? Users : User;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => { reset({ ...getValues(), telegram_chat_id: chat.id }); setTgChats([]); }}
                    className="flex w-full items-center gap-2 border-b border-border px-2.5 py-2 text-left text-xs last:border-b-0 hover:bg-accent"
                  >
                    <ChatIcon className="size-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-foreground">{chat.name || t('admin.common.unknownWrapped', '(未知)')}</span>
                    <span className="font-mono text-muted-foreground">{chat.id}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Row>
        <InputRow
          label="Webhook Secret"
          type="password"
          placeholder={t('admin.settings.telegram.webhookSecretPlaceholder', '自定义密钥（可选）')}
          register={register('telegram_webhook_secret')}
        />
        <Row last>
          <div className="flex w-full items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  const vals = getValues();
                  const r: any = await api.post('/telegram/test', {
                    bot_token: vals.telegram_bot_token,
                    chat_id: vals.telegram_chat_id,
                  });
                  toast.success(r.data?.message || t('admin.common.connectionSuccess', '连接成功'));
                } catch (e: any) { toast.error(e?.response?.data?.error?.message || t('admin.common.connectionFailed', '连接失败')); }
              }}
            >
              <Plug /> {t('admin.common.testConnection', '测试连接')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  const r: any = await api.post('/telegram/setup-webhook');
                  toast.success(r.data?.message || t('admin.settings.telegram.webhookSuccess', 'Webhook 设置成功'));
                } catch (e: any) { toast.error(e?.response?.data?.error?.message || t('admin.settings.telegram.webhookFailed', 'Webhook 设置失败')); }
              }}
            >
              <LinkIcon /> {t('admin.settings.telegram.setupWebhook', '设置 Webhook')}
            </Button>
          </div>
        </Row>
        <div className="border-t border-border bg-muted px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong>Webhook</strong> {t('admin.settings.telegram.webhookDescription', '是 Telegram 向你的服务器推送消息的回调地址。设置后，Bot 收到的消息会实时转发到你的博客后端，用于评论审批、回复等功能。需要先保存 Bot Token，再点「设置 Webhook」。')}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title={t('admin.settings.telegram.notifications.section', '通知功能')} icon={Bell}>
        <SwitchRow label={t('admin.settings.telegram.notifications.newComment', '新评论通知')} name="tg_notify_comment" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.telegram.notifications.newFollow', '新关注通知')} name="tg_notify_follow" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.telegram.notifications.postPublished', '文章发布通知')} name="tg_notify_publish" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.telegram.notifications.dailyReport', '每日数据报告')} name="tg_daily_report" watch={watch} setValue={setValue} last />
      </SettingsSection>

      <SettingsSection title={t('admin.settings.telegram.management.section', '管理功能')} icon={UserCog}>
        <SwitchRow label={t('admin.settings.telegram.management.commentApproval', '评论审批')} hint={t('admin.settings.telegram.management.commentApprovalHint', '回复 /approve 通过')} name="tg_comment_approve" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.telegram.management.replyComments', '回复评论')} hint={t('admin.settings.telegram.management.replyCommentsHint', '直接回复消息即可')} name="tg_comment_reply" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.telegram.management.publishMoment', '发布说说')} hint={t('admin.settings.telegram.management.publishMomentHint', '发送文字/图片自动发布')} name="tg_publish_moment" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.telegram.management.aiChat', 'AI 聊天')} hint={t('admin.settings.telegram.management.aiChatHint', '/ai 开头消息对接 AI 助手')} name="tg_ai_chat" watch={watch} setValue={setValue} last />
      </SettingsSection>

      <SettingsSection title={t('admin.settings.telegram.imageUpload.section', '图片上传')} icon={ImageIcon}>
        <SwitchRow
          label={t('admin.settings.telegram.imageUpload.autoUpload', '自动上传图片到媒体库')}
          hint={t('admin.settings.telegram.imageUpload.autoUploadHint', '通过 Telegram 发送图片时，自动上传到媒体库')}
          name="tg_auto_upload_image" watch={watch} setValue={setValue}
          last
        />
      </SettingsSection>
    </>
  );
}
