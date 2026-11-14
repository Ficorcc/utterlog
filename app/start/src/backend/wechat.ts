/**
 * 微信出站发送与通知。
 *
 * 个人微信没有官方开放的消息发送 API，所有出站消息都得经由「微信网关」
 * 中转 —— 网关负责真正登录你的微信号并发消息，站点只跟网关讲 HTTP。
 *
 * 网关配置存在 options 表里：
 *   wechat_gateway_url    网关基地址，例如 http://127.0.0.1:9527
 *   wechat_gateway_token  站点与网关之间的共享密钥（双向校验用）
 *   wechat_owner_id       主人自己的微信 ID，通知类消息发到这里
 *
 * 跟 Telegram 那套（backend/telegram.ts）是平行的两套通道，互不影响：
 * Telegram 走官方 Bot API，微信走网关。
 */

import { config, table } from './config';
import { exec, many, nowUnix, one } from './db/helpers';
import { optionValue } from './db/options';

export type WechatGatewayTarget = { url: string; token: string };

/** 网关健康状态。 */
export type WechatGatewayHealth = {
  ok: boolean;
  loggedIn?: boolean;
  wxid?: string;
  puppet?: string;
  error?: string;
};

export async function wechatGatewayConfig(): Promise<WechatGatewayTarget | null> {
  const url = (await optionValue('wechat_gateway_url', '')).trim().replace(/\/+$/, '');
  if (!url) return null;
  const token = (await optionValue('wechat_gateway_token', '')).trim();
  return { url, token };
}

/**
 * 调网关。POST JSON，带共享密钥。
 *
 * 密钥缺失时也放行 —— 本地自建网关可能没设密钥，但后台设置页会明确提示
 * 建议配置，避免公网暴露时被任意调用。
 */
export async function wechatGatewayRequest<T = any>(
  path: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const gw = await wechatGatewayConfig();
  if (!gw) throw new Error('微信网关未配置，请先在「设置 · 微信」填网关地址');
  const res = await fetch(`${gw.url}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(gw.token ? { 'x-gateway-token': gw.token } : {}),
    },
    body: JSON.stringify(payload ?? {}),
    signal: AbortSignal.timeout(15000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(String(data?.error || data?.message || `网关请求失败: HTTP ${res.status}`));
  }
  return data as T;
}

/** 网关健康检查。网关没起来时不要抛异常，返回 ok:false 让后台页面显示。 */
export async function wechatGatewayHealth(): Promise<WechatGatewayHealth> {
  const gw = await wechatGatewayConfig();
  if (!gw) return { ok: false, error: '未配置网关地址' };
  try {
    const res = await fetch(`${gw.url}/health`, {
      headers: gw.token ? { 'x-gateway-token': gw.token } : {},
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return {
      ok: data?.ok !== false,
      loggedIn: Boolean(data?.loggedIn),
      wxid: String(data?.wxid || ''),
      puppet: String(data?.puppet || ''),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 开关读取。跟 telegram.ts 的 optionEnabled 同语义：
 * 值在 true/1/on/yes 里算开，在 false/0/off/no 里算关，其余走 fallback。
 */
export async function optionEnabled(name: string, fallback = false) {
  const value = (await optionValue(name, fallback ? 'true' : 'false')).trim().toLowerCase();
  if (['true', '1', 'on', 'yes'].includes(value)) return true;
  if (['false', '0', 'off', 'no'].includes(value)) return false;
  return fallback;
}

/**
 * 发文本。
 *
 * gateOption 非空时先看开关（wx_notify_publish 之类），关了直接不发。
 * 单条微信文本上限约 2000 字，超了按段拆开发。
 */
export async function sendWechatText(
  to: string,
  text: string,
  gateOption = '',
  fallback = false,
): Promise<boolean> {
  const target = String(to || '').trim();
  if (!target) return false;
  if (gateOption && !(await optionEnabled(gateOption, fallback))) return false;
  const body = String(text || '');
  if (!body.trim()) return false;
  const chunks = splitWechatText(body);
  let sent = false;
  for (const chunk of chunks) {
    try {
      await wechatGatewayRequest('/send/text', { to: target, text: chunk });
      sent = true;
    } catch (error) {
      console.error('[wechat] 发送文本失败:', error instanceof Error ? error.message : error);
    }
  }
  return sent;
}

/** 发图片。url 必须是网关能取到的公网地址（或网关与站点同机时的本地地址）。 */
export async function sendWechatImage(
  to: string,
  url: string,
  caption = '',
  gateOption = '',
): Promise<boolean> {
  const target = String(to || '').trim();
  const image = String(url || '').trim();
  if (!target || !image) return false;
  if (gateOption && !(await optionEnabled(gateOption, false))) return false;
  try {
    await wechatGatewayRequest('/send/image', { to: target, url: image, caption: String(caption || '') });
    return true;
  } catch (error) {
    console.error('[wechat] 发送图片失败:', error instanceof Error ? error.message : error);
    return false;
  }
}

/** 发给主人（通知类消息）。没配 wechat_owner_id 就静默跳过。 */
export async function sendWechatToOwner(text: string, gateOption = '', fallback = false) {
  const owner = (await optionValue('wechat_owner_id', '')).trim();
  if (!owner) return false;
  return sendWechatText(owner, text, gateOption, fallback);
}

/** 微信单条文本约 2000 字上限，留一点余量按 1800 切。 */
export function splitWechatText(text: string, limit = 1800): string[] {
  const source = String(text || '');
  if (source.length <= limit) return [source];
  const chunks: string[] = [];
  let rest = source;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < Math.floor(limit * 0.5)) cut = limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, '');
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// ---------------------------------------------------------------------------
// 通知类消息
// ---------------------------------------------------------------------------

/** 新评论待审核。 */
export async function sendCommentModerationWechat(input: {
  commentId: number;
  postTitle: string;
  author: string;
  email: string;
  url: string;
  ip: string;
  content: string;
}) {
  const lines = [
    '新评论待审核',
    '',
    `文章: ${input.postTitle}`,
    `昵称: ${input.author || '访客'}`,
    `邮箱: ${input.email || '-'}`,
    input.url ? `主页: ${input.url}` : '',
    `IP: ${input.ip || '-'}`,
    '',
    input.content.slice(0, 1500),
    '',
    `#comment:${input.commentId}`,
    '',
    '回复这条消息即可回复该评论；或用 /approve ' + input.commentId + ' 通过、/reject ' + input.commentId + ' 拒绝。',
  ].filter(Boolean);
  await sendWechatToOwner(lines.join('\n'), 'wx_notify_comment', true);
}

/** 新关注（联邦）通知。 */
export async function sendFollowWechat(input: { name?: string; site: string }) {
  const lines = ['新关注通知', '', `站点: ${input.name || input.site}`, `地址: ${input.site}`].filter(Boolean);
  await sendWechatToOwner(lines.join('\n'), 'wx_notify_follow');
}

/** 文章发布成功通知。 */
export async function sendPostPublishedWechat(input: { title: string; url: string }) {
  const lines = ['文章已发布', '', input.title || '未命名文章', input.url].filter(Boolean);
  await sendWechatToOwner(lines.join('\n'), 'wx_notify_publish');
}

// ---------------------------------------------------------------------------
// 每日报告
// ---------------------------------------------------------------------------

export type DailyReport = { date: string; lines: string[] };

async function siteDateKey(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function siteLocalHour(timeZone: string) {
  try {
    const hour = new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', hour12: false }).format(new Date());
    return Number(hour);
  } catch {
    return new Date().getUTCHours();
  }
}

async function scalarCount(query: string, params: unknown[] = []) {
  const row = await one<{ count: string }>(query, params).catch(() => null);
  return Number(row?.count || 0);
}

/**
 * 每日数据报告。Telegram 与微信共用同一份统计口径与文案，
 * 避免两个通道的数字对不上。
 */
export async function buildDailyReport(): Promise<DailyReport> {
  const timeZone = (await optionValue('site_timezone', 'Asia/Shanghai')).trim() || 'Asia/Shanghai';
  const today = await siteDateKey(timeZone);
  const since = nowUnix() - 24 * 60 * 60;
  const [visits, uniqueVisitors, newPosts, newComments, pendingComments, totalPosts, totalComments, followers] = await Promise.all([
    scalarCount(`select count(*)::text as count from ${table('access_logs')} where created_at >= $1`, [since]),
    scalarCount(`select count(distinct coalesce(nullif(visitor_id,''), ip))::text as count from ${table('access_logs')} where created_at >= $1`, [since]),
    scalarCount(`select count(*)::text as count from ${table('posts')} where status = 'publish' and created_at >= $1`, [since]),
    scalarCount(`select count(*)::text as count from ${table('comments')} where created_at >= $1`, [since]),
    scalarCount(`select count(*)::text as count from ${table('comments')} where status in ('pending','spam')`),
    scalarCount(`select count(*)::text as count from ${table('posts')} where status = 'publish'`),
    scalarCount(`select count(*)::text as count from ${table('comments')}`),
    scalarCount(`select count(*)::text as count from ${table('followers')} where status = 'active'`),
  ]);
  const siteName = (await optionValue('site_title', 'Utterlog')).trim() || 'Utterlog';
  const siteUrl = (await optionValue('site_url', config.appUrl)).trim() || config.appUrl;
  const topPosts = await many<{ title: string; view_count: number }>(
    `select title, coalesce(view_count,0) as view_count
     from ${table('posts')}
     where status = 'publish'
     order by coalesce(view_count,0) desc, id desc
     limit 3`,
  ).catch(() => []);
  const lines = [
    `${siteName} 每日数据报告`,
    '',
    `日期: ${today}`,
    `站点: ${siteUrl}`,
    '',
    `近 24 小时访问: ${visits}`,
    `近 24 小时访客: ${uniqueVisitors}`,
    `新发布文章: ${newPosts}`,
    `新增评论: ${newComments}`,
    `待处理评论: ${pendingComments}`,
    `已发布文章总数: ${totalPosts}`,
    `评论总数: ${totalComments}`,
    `联邦关注者: ${followers}`,
  ];
  if (topPosts.length) {
    lines.push('', '访问最高文章:');
    for (const post of topPosts) lines.push(`- ${post.title || '未命名'} (${Number(post.view_count || 0)})`);
  }
  return { date: today, lines };
}

export async function sendDailyReportWechat(force = false) {
  if (!(await optionEnabled('wx_daily_report'))) return;
  const timeZone = (await optionValue('site_timezone', 'Asia/Shanghai')).trim() || 'Asia/Shanghai';
  const today = await siteDateKey(timeZone);
  if (!force) {
    const lastSent = (await optionValue('wechat_daily_report_last_date', '')).trim();
    if (lastSent === today) return;
    if ((await siteLocalHour(timeZone)) < 8) return;
  }
  const report = await buildDailyReport();
  await sendWechatToOwner(report.lines.join('\n'), 'wx_daily_report');
  await exec(
    `insert into ${table('options')} (name, value, created_at, updated_at)
     values ($1,$2,$3,$3)
     on conflict (name) do update set value = excluded.value, updated_at = excluded.updated_at`,
    ['wechat_daily_report_last_date', report.date, nowUnix()],
  ).catch(() => {});
}

/** 服务启动时挂上每日报告定时器（跟 Telegram 那套一个节奏）。 */
export function startWechatDailyReport() {
  const run = () => sendDailyReportWechat().catch((err) => console.error('[wechat-daily-report] error', err));
  setTimeout(run, 10 * 60_000).unref();
  setInterval(run, 60 * 60_000).unref();
}
