/**
 * 设置页 · 微信 tab。
 *
 * 个人微信没有官方发送 API，站点不直接连微信，而是连「微信网关」——
 * 一个跑在你自己服务器上的小服务，它负责登录你的微信号、收发消息。
 * 这里填网关地址和共享密钥，站点与网关之间的所有往来都靠这把密钥校验。
 *
 * 网关服务本体见 微信Bot/gateway 目录。
 */

import type {
  UseFormRegister, UseFormWatch, UseFormSetValue, UseFormGetValues,
} from 'react-hook-form';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/shadcn';
import {
  Loader2, Plug, Bell, UserCog, Bot, Image as ImageIcon, ShieldCheck, Link as LinkIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { InputRow, Row, SettingsSection, SwitchRow } from './shared';

type GatewayState = { ok: boolean; loggedIn?: boolean; wxid?: string; puppet?: string; error?: string };

export default function WeChatTab({
  t, register, watch, setValue, getValues,
}: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
}) {
  const [testing, setTesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [gateway, setGateway] = useState<GatewayState | null>(null);

  const checkGateway = async () => {
    setChecking(true);
    try {
      const r: any = await api.get('/wechat/status');
      setGateway(r.data || null);
    } catch (e: any) {
      setGateway({ ok: false, error: e?.response?.data?.error?.message || t('admin.common.fetchFailed', '获取失败') });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkGateway();
    // 只在挂载时探一次；网关状态由「刷新状态」按钮手动更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const siteUrl = watch('site_url') || '';

  return (
    <>
      <SettingsSection title={t('admin.settings.wechat.connection.section', '网关连接')} icon={Bot}>
        <InputRow
          label={t('admin.settings.wechat.gatewayUrl', '网关地址')}
          hint={t('admin.settings.wechat.gatewayUrlHint', '微信网关服务的地址，例如 http://127.0.0.1:9527（跟站点同机时用内网地址）')}
          placeholder="http://127.0.0.1:9527"
          register={register('wechat_gateway_url')}
        />
        <InputRow
          label={t('admin.settings.wechat.gatewayToken', '共享密钥')}
          type="password"
          hint={t('admin.settings.wechat.gatewayTokenHint', '站点与网关之间的校验密钥，两边必须一致；公网暴露时务必设置')}
          placeholder={t('admin.settings.wechat.gatewayTokenPlaceholder', '自定义密钥（建议填写）')}
          register={register('wechat_gateway_token')}
        />
        <InputRow
          label={t('admin.settings.wechat.ownerId', '主人微信 ID')}
          hint={t('admin.settings.wechat.ownerIdHint', '接收通知的微信 ID（wxid_xxx 或群 ID），新评论、发布通知都发到这里')}
          placeholder="wxid_xxxxxxxxxxxxx"
          register={register('wechat_owner_id')}
        />
        <InputRow
          label={t('admin.settings.wechat.allowedUsers', '允许操作的用户')}
          hint={t('admin.settings.wechat.allowedUsersHint', '逗号分隔的微信 ID 或群 ID；留空表示不限制。填了之后只有名单内的人能发指令')}
          placeholder="wxid_xxx, wxid_yyy"
          register={register('wechat_allowed_users')}
        />
        <Row last>
          <div className="flex w-full flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                try {
                  await api.post('/wechat/test');
                  toast.success(t('admin.settings.wechat.testSuccess', '测试消息已发送，去微信看看'));
                } catch (e: any) {
                  toast.error(e?.response?.data?.error?.message || t('admin.common.connectionFailed', '连接失败'));
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? <Loader2 className="animate-spin" /> : <Plug />}
              {t('admin.common.testConnection', '测试连接')}
            </Button>
            <Button type="button" variant="outline" disabled={checking} onClick={checkGateway}>
              {checking ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {t('admin.settings.wechat.checkStatus', '刷新状态')}
            </Button>
          </div>
        </Row>
        {gateway && (
          <div className="border-t border-border bg-muted px-3.5 py-2.5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {gateway.ok
                ? <>网关正常{gateway.loggedIn ? '，微信已登录' : '，但微信号尚未登录'}；{gateway.wxid ? <>微信号 <code className="font-mono text-foreground">{gateway.wxid}</code></> : null}{gateway.puppet ? <>；协议 <code className="font-mono text-foreground">{gateway.puppet}</code></> : null}</>
                : <>网关不可用：{gateway.error || '未知原因'}</>}
            </p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title={t('admin.settings.wechat.callback.section', '回调地址')} icon={LinkIcon}>
        <div className="border-t border-border px-3.5 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('admin.settings.wechat.callback.description', '把下面的地址填进微信网关的配置文件（WEIBOT_CALLBACK_URL），网关收到微信消息后会推送到这里。')}
          </p>
          <code className="mt-2 block break-all rounded-md bg-muted px-2.5 py-2 font-mono text-xs text-foreground">
            {String(siteUrl || '').replace(/\/+$/, '')}/api/v1/wechat/inbound
          </code>
        </div>
      </SettingsSection>

      <SettingsSection title={t('admin.settings.wechat.notifications.section', '通知功能')} icon={Bell}>
        <SwitchRow label={t('admin.settings.wechat.notifications.newComment', '新评论通知')} name="wx_notify_comment" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.wechat.notifications.newFollow', '新关注通知')} name="wx_notify_follow" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.wechat.notifications.postPublished', '文章发布通知')} name="wx_notify_publish" watch={watch} setValue={setValue} />
        <SwitchRow label={t('admin.settings.wechat.notifications.dailyReport', '每日数据报告')} name="wx_daily_report" watch={watch} setValue={setValue} last />
      </SettingsSection>

      <SettingsSection title={t('admin.settings.wechat.management.section', '管理功能')} icon={UserCog}>
        <SwitchRow
          label={t('admin.settings.wechat.management.publishMoment', '发布说说')}
          hint={t('admin.settings.wechat.management.publishMomentHint', '不在发布流程时，直接发文字即发布一条说说')}
          name="wx_publish_moment" watch={watch} setValue={setValue}
        />
        <SwitchRow
          label={t('admin.settings.wechat.management.autoUploadImage', '自动上传图片到媒体库')}
          hint={t('admin.settings.wechat.management.autoUploadImageHint', '直接发图片时自动存进媒体库并回传地址')}
          name="wx_auto_upload_image" watch={watch} setValue={setValue}
          last
        />
      </SettingsSection>

      <SettingsSection title={t('admin.settings.wechat.usage.section', '微信里怎么用')} icon={ImageIcon}>
        <div className="border-t border-border px-3.5 py-3">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
{`/publish                分步发布文章（标题 → 正文 → 确认）
/publish_done           结束正文，进入确认
/publish_confirm        确认发布
/publish_cancel         取消发布
/reply <评论ID> <内容>    回复评论
/comments               待审核评论列表
/approve <评论ID>       通过评论
/reject <评论ID>        拒绝评论
/refresh                刷新 RSS 订阅源
/stats                  数据报告
/ai <问题>              AI 问答`}
          </pre>
        </div>
      </SettingsSection>
    </>
  );
}
