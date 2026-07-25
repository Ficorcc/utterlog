import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { nowUnix } from '../db/helpers';
import { optionValue, saveOption } from '../db/options';

/**
 * 新评论通知邮件里的一键审核链接。
 *
 * 签名机制照搬退订链接（HMAC + 存在 options 里的密钥），但有一条关键区别：
 * **GET 绝对不能直接执行操作**。Gmail、Outlook、企业邮件网关都会自动预取
 * 邮件里的所有链接做安全扫描 —— 一键审批要是做成 GET 生效，垃圾评论会在
 * 站长还没打开邮件时就被扫描器自动通过。所以链接指向确认页，POST 才落库，
 * 见 routes/api/v1/comments/moderate.ts。
 *
 * token 把 (评论 ID, 动作, 过期时间) 一起签进去：改任何一个参数签名都对不上，
 * 拿「通过」的链接改不出「标记垃圾」的效果。
 */
export type ModerationAction = 'approve' | 'spam';

export const MODERATION_ACTIONS: ModerationAction[] = ['approve', 'spam'];

/** 7 天。通知邮件躺一周还没处理的，回后台看更合适。 */
export const MODERATION_TTL_SECONDS = 7 * 86400;

export function isModerationAction(value: unknown): value is ModerationAction {
  return MODERATION_ACTIONS.includes(String(value || '') as ModerationAction);
}

async function moderationSecret() {
  let secret = (await optionValue('comment_moderation_secret', '')).trim();
  if (!secret) {
    secret = randomBytes(32).toString('hex');
    await saveOption('comment_moderation_secret', secret);
  }
  return secret;
}

function signature(secret: string, commentId: number, action: ModerationAction, expiresAt: number) {
  return createHmac('sha256', secret)
    .update(`comment_moderation:${commentId}:${action}:${expiresAt}`)
    .digest('base64url')
    .slice(0, 32);
}

export async function commentModerationUrl(
  siteUrl: string,
  commentId: number,
  action: ModerationAction,
  expiresAt = nowUnix() + MODERATION_TTL_SECONDS,
) {
  if (!(commentId > 0)) return '';
  const sig = signature(await moderationSecret(), commentId, action, expiresAt);
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}/api/v1/comments/moderate?c=${commentId}&a=${action}&e=${expiresAt}&t=${sig}`;
}

export type ModerationClaim = { commentId: number; action: ModerationAction; expiresAt: number };

/**
 * 校验链接参数。返回 null 表示不可信 —— 调用方一律当成无效处理，不要试图
 * 从中区分「签名错」还是「已过期」再给不同待遇，那是给爆破留缝。过期单独
 * 返回 'expired' 只是为了页面能提示得友好些。
 */
export async function verifyCommentModeration(
  rawId: unknown, rawAction: unknown, rawExpires: unknown, rawSig: unknown,
): Promise<ModerationClaim | 'expired' | null> {
  const commentId = Number(rawId);
  const expiresAt = Number(rawExpires);
  const action = String(rawAction || '');
  const provided = String(rawSig || '');
  if (!Number.isInteger(commentId) || commentId <= 0) return null;
  if (!Number.isInteger(expiresAt) || expiresAt <= 0) return null;
  if (!isModerationAction(action)) return null;
  if (!provided) return null;

  const expected = signature(await moderationSecret(), commentId, action, expiresAt);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  // 先验签名再看过期：顺序反过来的话，过期链接的响应会快一截，等于泄露了
  // 「这个签名是对的」。
  if (expiresAt < nowUnix()) return 'expired';
  return { commentId, action, expiresAt };
}
