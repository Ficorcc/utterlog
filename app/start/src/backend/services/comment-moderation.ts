import { config, table } from '../config';
import { one } from '../db/helpers';
import { optionValue } from '../db/options';
import {
  verifyCommentModeration,
  type ModerationAction,
} from '../email/comment-moderation';
import { htmlEscape } from '../email/templates';
import { updateAdminComment } from './comments';

/**
 * 新评论通知邮件里「通过 / 标记垃圾」按钮的落地页。
 *
 * GET 只渲染确认页，POST 才真正改状态 —— 邮件网关会自动预取链接做安全扫描，
 * GET 直接生效的话，垃圾评论会在站长打开邮件之前就被扫描器自动通过。
 */

const ACTION_TEXT: Record<ModerationAction, { verb: string; done: string; nextStatus: string; color: string }> = {
  approve: { verb: '通过这条评论', done: '已通过', nextStatus: 'approved', color: '#0f7b3f' },
  spam: { verb: '标记为垃圾评论', done: '已标记为垃圾', nextStatus: 'spam', color: '#b42318' },
};

const STATUS_LABEL: Record<string, string> = {
  approved: '已通过', pending: '待审核', spam: '垃圾评论', trash: '已删除',
};

function page(options: {
  title: string; siteUrl: string; heading: string; headingColor: string;
  body: string; form?: string;
}) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${htmlEscape(options.heading)} - ${htmlEscape(options.title)}</title>
<style>body{margin:0;font:14px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f6f9;color:#0d1a2d;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#fff;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.05);padding:36px 40px;max-width:520px;width:100%}
h1{font-size:18px;color:${options.headingColor};margin:0 0 16px}
p{font-size:13px;color:#5a6b7f;margin:0 0 12px}
.quote{background:#f5f7fa;border-left:3px solid #c8d3e0;padding:12px 14px;margin:16px 0;font-size:13px;color:#0d1a2d;word-break:break-word}
.meta{font-size:12px;color:#8ea0b4;margin-top:8px}
button{appearance:none;border:0;border-radius:6px;padding:11px 26px;font-size:14px;font-weight:600;color:#fff;background:${options.headingColor};cursor:pointer}
button:hover{filter:brightness(1.08)}
.home{display:inline-block;margin-top:18px;font-size:12px;color:#8ea0b4;text-decoration:none;border-bottom:1px solid #cdd5df}</style>
</head><body><div class="card">
<h1>${htmlEscape(options.heading)}</h1>
${options.body}
${options.form || ''}
<a class="home" href="${htmlEscape(options.siteUrl)}">返回首页</a>
</div></body></html>`;
}

export async function commentModerationResponse(searchParams: URLSearchParams, method: string) {
  const title = await optionValue('site_title', 'Utterlog');
  const siteUrl = (await optionValue('site_url', config.appUrl)).replace(/\/+$/, '') || '/';
  const shell = (heading: string, color: string, body: string, form?: string, status = 200) =>
    new Response(page({ title, siteUrl, heading, headingColor: color, body, form }), {
      status, headers: { 'content-type': 'text/html; charset=utf-8' },
    });

  const claim = await verifyCommentModeration(
    searchParams.get('c'), searchParams.get('a'), searchParams.get('e'), searchParams.get('t'),
  );
  if (claim === 'expired') {
    return shell('链接已过期', '#b42318',
      '<p>这条审核链接已超过 7 天有效期。请到后台的评论管理里处理。</p>', '', 400);
  }
  if (!claim) {
    return shell('链接无效', '#b42318',
      '<p>这条审核链接已损坏或不完整。请从通知邮件里重新点击，或到后台的评论管理里处理。</p>', '', 400);
  }

  const comment = await one<{ id: number; author_name: string; content: string; status: string }>(
    `select id, coalesce(author_name,'') as author_name, coalesce(content,'') as content, status
     from ${table('comments')} where id = $1`, [claim.commentId],
  ).catch(() => null);
  if (!comment) {
    return shell('评论不存在', '#b42318',
      '<p>这条评论已经被删除了，无需再处理。</p>', '', 404);
  }

  const action = ACTION_TEXT[claim.action];
  const summary = `<div class="quote">${htmlEscape(comment.content.slice(0, 300))}${comment.content.length > 300 ? '…' : ''}
<div class="meta">— ${htmlEscape(comment.author_name || '访客')} · 当前状态：${htmlEscape(STATUS_LABEL[comment.status] || comment.status)}</div></div>`;

  // 已经是目标状态就别再写一次库，直接告诉用户处理过了 —— 邮件可能被点两次。
  if (comment.status === action.nextStatus) {
    return shell(action.done, action.color,
      `<p>这条评论${htmlEscape(action.done)}，无需重复操作。</p>${summary}`);
  }

  if (method.toUpperCase() !== 'POST') {
    // 确认页：把参数原样放进表单，POST 时重新走一遍完整校验。
    const hidden = ['c', 'a', 'e', 't']
      .map((key) => `<input type="hidden" name="${key}" value="${htmlEscape(searchParams.get(key) || '')}">`)
      .join('');
    return shell(`确认${action.verb}？`, action.color,
      `<p>来自 <b>${htmlEscape(comment.author_name || '访客')}</b> 的评论：</p>${summary}`,
      `<form method="post">${hidden}<button type="submit">确认${htmlEscape(action.verb)}</button></form>`);
  }

  const updated = await updateAdminComment(claim.commentId, { status: action.nextStatus }).catch(() => null);
  if (!updated) {
    return shell('操作失败', '#b42318',
      `<p>没能更新这条评论，请到后台的评论管理里处理。</p>${summary}`, '', 500);
  }
  return shell(action.done, action.color,
    `<p>操作已完成，这条评论现在${htmlEscape(action.done)}。</p>${summary}`);
}
