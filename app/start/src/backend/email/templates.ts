import { config } from '../config';
import { optionValue } from '../db/options';

/**
 * 邮件模板。
 *
 * 这套模板在 Bun 重写（85f3710）之前是 Go 侧的 `api/internal/email/tpl/*.html`，
 * 重写时没有跟着迁过来 —— 之后所有通知邮件都退化成了一段裸 <div>/<p>，
 * 没有品牌、没有排版、没有按钮。这里按原样把外壳和四个常用模板移植回 TS。
 *
 * 为什么全是 table + 行内样式：邮件客户端（尤其 Outlook 桌面版）对 flex/grid
 * 和 <style> 块的支持极不可靠，table 布局 + inline style 是唯一稳妥写法。
 * 这也是原 Go 模板的做法，照搬即可，别按网页的习惯改写。
 *
 * 未移植的旧模板：link_request / incident / upgrade / pending_comment ——
 * 当前 Bun 版没有对应的发信场景，等真要用时再补。旧模板仍可从
 * `git show 85f3710^:api/internal/email/tpl/<name>.html` 取出。
 */

export function htmlEscape(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailSite = { title: string; url: string; logo: string };

/** 站点信息，模板外壳的品牌区要用。 */
export async function emailSite(): Promise<EmailSite> {
  const [title, url, logo] = await Promise.all([
    optionValue('site_title', 'Utterlog'),
    optionValue('site_url', config.appUrl),
    optionValue('site_logo', ''),
  ]);
  return {
    title: (title || 'Utterlog').trim(),
    url: (url || config.appUrl).replace(/\/+$/, ''),
    logo: (logo || '').trim(),
  };
}

const BRAND = '#0052d9';
const TEXT = '#0d1a2d';
const MUTED = '#5a6b7f';
const DIM = '#8ea0b4';
const SOFT_BG = '#f5f7fa';
const LINE = '#e1e6eb';

/** 品牌区：logo 有就用 logo，没有就用站点名首字做方块。 */
function brand(site: EmailSite) {
  const mark = site.logo
    ? `<img src="${htmlEscape(site.logo)}" alt="" width="32" height="32" style="display:block;border-radius:2px;">`
    : `<div style="width:32px;height:32px;background:${BRAND};color:#fff;font-weight:700;font-size:15px;line-height:32px;text-align:center;">${htmlEscape([...site.title][0] || 'U')}</div>`;
  // aria-hidden + user-select:none：让邮件预览片段和读屏从正文开始，
  // 不要先念一遍站点名。原 Go 模板就是这么处理的。
  return `<table aria-hidden="true" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;user-select:none;-webkit-user-select:none;"><tr>
<td width="40" valign="middle">${mark}</td>
<td valign="middle" style="padding-left:10px;">
<span style="font-size:18px;font-weight:700;color:${BRAND};letter-spacing:-0.3px;">${htmlEscape(site.title)}</span>
</td>
</tr></table>
<div style="height:1px;background:${LINE};margin:24px 0;"></div>`;
}

const POWERED = `<p style="font-size:11px;color:#9aa5b0;margin:28px 0 0;line-height:1.7;text-align:center;">
Powered by <a target="_blank" rel="noopener noreferrer" href="https://utterlog.io" style="color:${DIM};font-weight:700;text-decoration:none;">Utterlog!</a>
</p>`;

/** 评论回复专用页脚：左退订、右 Powered by。 */
function footerWithUnsub(unsubscribeUrl: string) {
  if (!unsubscribeUrl) return POWERED;
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;"><tr>
<td valign="middle" align="left" style="font-size:11px;color:#9aa5b0;line-height:1.7;">不想再收到回复通知？<a target="_blank" rel="noopener noreferrer" href="${htmlEscape(unsubscribeUrl)}" style="color:${DIM};text-decoration:underline;">点击此处</a>退订。</td>
<td valign="middle" align="right" style="font-size:11px;color:#9aa5b0;line-height:1.7;white-space:nowrap;padding-left:10px;">Powered by <a target="_blank" rel="noopener noreferrer" href="https://utterlog.io" style="color:${DIM};font-weight:700;text-decoration:none;">Utterlog!</a></td>
</tr></table>`;
}

/** 统一外壳：灰底 + 600px 白卡片。所有模板都从这里出。 */
function shell(site: EmailSite, body: string, footer = POWERED) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${htmlEscape(site.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:${TEXT};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.04);border-radius:4px;overflow:hidden;"><tr><td style="padding:40px 40px 36px;">
${brand(site)}
${body}
${footer}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string, primary = true) {
  const style = primary
    ? `color:#fff;background:${BRAND};`
    : `color:${BRAND};background:#fff;border:1px solid ${BRAND};`;
  return `<a target="_blank" rel="noopener noreferrer" href="${htmlEscape(href)}" style="display:inline-block;padding:10px 26px;font-size:13px;font-weight:500;text-decoration:none;margin:14px 6px 0 0;${style}">${htmlEscape(label)}</a>`;
}

function quote(content: string, accent = '#c8d3e0') {
  return `<div style="background:${SOFT_BG};border-left:3px solid ${accent};padding:14px 16px;margin:8px 0 16px;font-size:13px;line-height:1.7;color:${MUTED};">${htmlEscape(content)}</div>`;
}

/** 国旗 + IP 归属，新评论/密码重置里标注来源用。 */
function flag(countryCode: string) {
  const code = String(countryCode || '').trim().toLowerCase();
  if (!code) return '';
  return `<img src="https://flagcdn.io/flags/1x1/${htmlEscape(code)}.svg" alt="${htmlEscape(code)}" width="14" height="14" style="vertical-align:-3px;margin-right:4px;display:inline-block;">`;
}

// ── 具体模板 ────────────────────────────────────────────────────

export function verifyCodeEmail(site: EmailSite, input: { code: string; purpose?: string; expireMins?: number }) {
  const mins = input.expireMins && input.expireMins > 0 ? input.expireMins : 10;
  const body = `<p style="font-size:15px;line-height:1.7;color:${TEXT};margin:0 0 16px;">
您的 <b>${htmlEscape(site.title)}</b>${input.purpose ? ` ${htmlEscape(input.purpose)}` : ''}验证码为：
</p>
<div style="background:#eaf3ff;padding:28px 16px;text-align:center;margin:20px auto;max-width:300px;font-size:36px;font-weight:600;letter-spacing:8px;color:${TEXT};">${htmlEscape(input.code)}</div>
<p style="font-size:13px;line-height:1.8;color:${MUTED};margin:0 0 12px;">
此验证码将于 <b>${mins} 分钟后过期</b>，并且仅可使用一次。请勿与他人分享。
</p>
<div style="height:1px;background:${LINE};margin:24px 0;"></div>
<div style="padding:10px 14px;background:${SOFT_BG};border-left:3px solid #c8d3e0;font-size:11px;color:#9aa5b0;line-height:1.8;">这是一封自动发送的邮件，请勿直接回复；如果您并未请求此验证码，请忽略本邮件。</div>`;
  return shell(site, body);
}

export function passwordResetEmail(site: EmailSite, input: {
  userName?: string; resetUrl: string; expireMins?: number;
  ip?: string; ipLocation?: string; countryCode?: string; requestedAt?: string;
}) {
  const mins = input.expireMins && input.expireMins > 0 ? input.expireMins : 60;
  const source = (input.ip || input.requestedAt) ? `<div style="background:${SOFT_BG};border-left:3px solid #c8d3e0;padding:12px 16px;margin:20px 0 0;font-size:12px;line-height:1.9;color:${MUTED};">
<b style="color:${TEXT};font-weight:600;">申请来源</b>
${input.ip ? `<div><b style="display:inline-block;min-width:60px;color:${DIM};font-weight:500;">IP</b>${flag(input.countryCode || '')}${htmlEscape(input.ip)}${input.ipLocation ? ` · ${htmlEscape(input.ipLocation)}` : ''}</div>` : ''}
${input.requestedAt ? `<div><b style="display:inline-block;min-width:60px;color:${DIM};font-weight:500;">时间</b>${htmlEscape(input.requestedAt)}</div>` : ''}
</div>` : '';
  const body = `<p style="font-size:15px;line-height:1.7;color:${TEXT};margin:0 0 16px;">
你正在请求重置 <b>${htmlEscape(site.title)}</b> 后台账号密码
</p>
<p style="font-size:14px;line-height:1.7;color:${TEXT};margin:0 0 18px;">
Hi ${htmlEscape(input.userName || '')}，点击下方按钮设置新密码（链接有效期 <b>${mins} 分钟</b>）：
</p>
${button(input.resetUrl, '重置密码')}
<p style="font-size:12px;line-height:1.7;color:${DIM};margin:20px 0 0;">
如果按钮无法点击，复制以下链接到浏览器：<br>
<span style="word-break:break-all;color:${BRAND};">${htmlEscape(input.resetUrl)}</span>
</p>
${source}
<div style="background:#fff7e6;border-left:3px solid #f59e0b;padding:12px 16px;margin:20px 0 0;font-size:12px;line-height:1.7;color:#664c12;">
<b>安全提示</b>：如果不是你本人发起的请求，请直接忽略此邮件，无需任何操作；账号密码不会被改变。链接超过 ${mins} 分钟后自动失效。
</div>`;
  return shell(site, body);
}

export function commentReplyEmail(site: EmailSite, input: {
  recipientName: string; replierName: string; postTitle: string;
  originalContent: string; replyContent: string; postUrl: string; unsubscribeUrl?: string;
}) {
  const body = `<p style="font-size:15px;line-height:1.7;color:${TEXT};margin:0 0 16px;">
你好 <b>${htmlEscape(input.recipientName)}</b>，<b>${htmlEscape(input.replierName)}</b> 回复了你在《${htmlEscape(input.postTitle)}》的评论
</p>
<p style="font-size:13px;line-height:1.8;color:${MUTED};margin:20px 0 6px;">你说的是：</p>
${quote(input.originalContent)}
<p style="font-size:13px;line-height:1.8;color:${MUTED};margin:0 0 6px;">${htmlEscape(input.replierName)} 的回复：</p>
<div style="background:${SOFT_BG};border-left:3px solid ${BRAND};padding:14px 16px;margin:8px 0 16px;font-size:13px;line-height:1.7;color:${TEXT};">${htmlEscape(input.replyContent)}</div>
${button(input.postUrl, '查看完整回复')}`;
  return shell(site, body, footerWithUnsub(input.unsubscribeUrl || ''));
}

export function newCommentEmail(site: EmailSite, input: {
  author: string; postTitle: string; content: string; postUrl: string; manageUrl: string;
  status?: string; email?: string; url?: string; ip?: string; ipLocation?: string;
  countryCode?: string; postedAt?: string;
}) {
  const meta = input.ip
    ? `<td valign="middle" align="right" style="font-size:11px;color:${DIM};line-height:1.4;white-space:nowrap;padding-left:10px;">${flag(input.countryCode || '')}${htmlEscape(input.ip)}${input.ipLocation ? `<span style="color:#aebbcb;"> · ${htmlEscape(input.ipLocation)}</span>` : ''}</td>`
    : '';
  const body = `<p style="font-size:15px;line-height:1.7;color:${TEXT};margin:0 0 16px;">
<b>${htmlEscape(input.author)}</b> 在《${htmlEscape(input.postTitle)}》发表了新评论${input.status ? `（${htmlEscape(input.status)}）` : ''}
</p>
<div style="background:${SOFT_BG};border-left:3px solid ${BRAND};padding:14px 16px;margin:16px 0;color:${TEXT};">
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0;"><tr>
<td valign="middle" align="left" style="font-size:14px;line-height:1.4;">
${input.url
    ? `<a target="_blank" rel="noopener noreferrer" href="${htmlEscape(input.url)}" style="color:${TEXT};font-weight:600;text-decoration:none;">${htmlEscape(input.author)}</a>`
    : `<b style="color:${TEXT};font-weight:600;">${htmlEscape(input.author)}</b>`}
</td>
${meta}
</tr></table>
${input.email ? `<div style="font-size:12px;color:${DIM};line-height:1.7;margin-top:4px;"><a target="_blank" rel="noopener noreferrer" href="mailto:${htmlEscape(input.email)}" style="color:${DIM};text-decoration:none;">${htmlEscape(input.email)}</a></div>` : ''}
${input.url ? `<div style="font-size:12px;color:${DIM};line-height:1.7;word-break:break-all;"><a target="_blank" rel="noopener noreferrer" href="${htmlEscape(input.url)}" style="color:${DIM};text-decoration:none;">${htmlEscape(input.url)}</a></div>` : ''}
<div style="height:1px;background:#dfe5ec;margin:12px 0;"></div>
<div style="font-size:13px;line-height:1.8;color:${TEXT};">${htmlEscape(input.content)}</div>
${input.postedAt ? `<div style="font-size:11px;color:#aebbcb;line-height:1.4;margin-top:10px;text-align:right;">${htmlEscape(input.postedAt)}</div>` : ''}
</div>
${button(input.postUrl, '查看文章')}${button(input.manageUrl, '管理评论', false)}`;
  return shell(site, body);
}

/** 通用单段落邮件（测试邮件等没有专属模板的场景）。 */
export function noticeEmail(site: EmailSite, input: { heading: string; lines?: string[]; actionUrl?: string; actionLabel?: string }) {
  const body = `<p style="font-size:15px;line-height:1.7;color:${TEXT};margin:0 0 16px;">${htmlEscape(input.heading)}</p>
${(input.lines || []).map((line) => `<p style="font-size:13px;line-height:1.8;color:${MUTED};margin:0 0 8px;">${htmlEscape(line)}</p>`).join('\n')}
${input.actionUrl && input.actionLabel ? button(input.actionUrl, input.actionLabel) : ''}`;
  return shell(site, body);
}
