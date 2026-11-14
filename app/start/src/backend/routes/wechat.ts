/**
 * 微信入站命令处理。
 *
 * 网关把收到的微信消息规范化后 POST 到 /api/v1/wechat/inbound，
 * 这里负责解析指令、调用站点服务、再把结果发回微信。
 *
 * 能力：
 *   /publish              分步发布文章（标题 → 正文 → 确认）
 *   /reply <评论ID> <内容>  回复评论
 *   /comments             待审核评论列表
 *   /approve /reject <ID> 审核评论
 *   /refresh              刷新 RSS 订阅源
 *   /stats                数据报告
 *   /ai <问题>            AI 问答
 *   直接发图              上传到媒体库（发布流程中则作为封面）
 *
 * 分步会话状态存在 options 表里（wechat_sessions），30 分钟过期。
 *
 * 依赖全部走 createWechatBot(deps) 注入：单测传假实现就能跑完整条命令链，
 * 不用去 mock 全局模块（mock.module 是全局的，会污染同批次的其它测试）。
 */

import { extname } from 'node:path';
import { config, table } from '../config';
import { exec, intParam, many, nowUnix, one } from '../db/helpers';
import { optionValue, saveOption } from '../db/options';
import { storeUploadedBytes } from '../media/storage';
import { replyToAdminComment } from '../services/comments';
import { createPost, postPath } from '../services/posts';
import { buildDailyReport, sendWechatImage, sendWechatText } from '../wechat';
import { callAiText } from './ai';
import { runFeedFetch } from './compat';

/** 网关规范化后的入站消息。 */
export type WechatInboundMessage = {
  id?: string;
  /** 发送者微信 ID（wxid_xxx） */
  from: string;
  fromName?: string;
  /** 群 ID，私聊为空 */
  roomId?: string;
  roomName?: string;
  text?: string;
  type?: 'text' | 'image' | 'file' | 'other';
  /** 图片原始地址（网关可下载的地址） */
  imageUrl?: string;
  filename?: string;
  /** 被引用消息的正文（用于「引用回复 = 回复评论」） */
  replyTo?: string;
  timestamp?: number;
};

export class WechatServiceError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** 站点侧依赖：真实实现与测试假实现走同一套接口。 */
export type WechatBotDeps = {
  optionValue: (name: string, fallback?: string) => Promise<string>;
  saveOption: (name: string, value: string) => Promise<void>;
  one: <T extends Record<string, unknown> = any>(query: string, params?: unknown[]) => Promise<T | null>;
  many: <T extends Record<string, unknown> = any>(query: string, params?: unknown[]) => Promise<T[]>;
  exec: (query: string, params?: unknown[]) => Promise<unknown>;
  nowUnix: () => number;
  intParam: (value: string | undefined, fallback?: number) => number;
  createPost: (body: Record<string, unknown>, userId: number) => Promise<number>;
  replyToAdminComment: (parentId: number, userId: number, input: unknown) => Promise<any>;
  storeUploadedBytes: (
    bytes: Buffer, ext: string, mimeType: string, folder: string,
  ) => Promise<{ relativePath: string; url: string; driver: string }>;
  runFeedFetch: (options: Record<string, unknown>) => Promise<any>;
  callAiText: (
    messages: { role: string; content: string }[], action: string, userId?: number,
  ) => Promise<{ content: string }>;
  buildDailyReport: () => Promise<{ date: string; lines: string[] }>;
  sendText: (to: string, text: string) => Promise<boolean>;
  sendImage: (to: string, url: string, caption?: string) => Promise<boolean>;
  postPath: (post: Record<string, unknown>, template: string, timeZone: string) => string;
};

const realDeps: WechatBotDeps = {
  optionValue,
  saveOption,
  one: one as WechatBotDeps['one'],
  many: many as WechatBotDeps['many'],
  exec,
  nowUnix,
  intParam,
  createPost,
  replyToAdminComment,
  storeUploadedBytes,
  runFeedFetch: runFeedFetch as WechatBotDeps['runFeedFetch'],
  callAiText: callAiText as WechatBotDeps['callAiText'],
  buildDailyReport,
  sendText: (to, text) => sendWechatText(to, text),
  sendImage: (to, url, caption) => sendWechatImage(to, url, caption),
  postPath,
};

// ---------------------------------------------------------------------------
// 会话状态（分步发布）
// ---------------------------------------------------------------------------

type WechatSession = {
  stage: 'title' | 'body' | 'confirm';
  title?: string;
  content?: string;
  cover?: string;
  /** 由 setSession 统一写入，调用方不用关心 */
  updatedAt?: number;
};

const SESSION_TTL = 30 * 60 * 1000;

export function createWechatBot(deps: WechatBotDeps) {
  // -------------------------------------------------------------------------
  // 会话状态
  // -------------------------------------------------------------------------

  async function loadSessions(): Promise<Record<string, WechatSession>> {
    const raw = (await deps.optionValue('wechat_sessions', '{}')).trim();
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, WechatSession> : {};
    } catch {
      return {};
    }
  }

  async function saveSessions(sessions: Record<string, WechatSession>) {
    await deps.saveOption('wechat_sessions', JSON.stringify(sessions));
  }

  function sessionKey(message: WechatInboundMessage) {
    const from = String(message.from || '').trim();
    const room = String(message.roomId || '').trim();
    return room ? `${room}:${from}` : from;
  }

  /** 取当前用户的会话；过期的一律当没有。 */
  async function getSession(key: string): Promise<WechatSession | null> {
    const sessions = await loadSessions();
    const session = sessions[key];
    if (!session) return null;
    if (Date.now() - Number(session.updatedAt || 0) > SESSION_TTL) {
      delete sessions[key];
      await saveSessions(sessions);
      return null;
    }
    return session;
  }

  async function setSession(key: string, session: WechatSession | null) {
    const sessions = await loadSessions();
    if (!session) delete sessions[key];
    else sessions[key] = { ...session, updatedAt: Date.now() };
    await saveSessions(sessions);
  }

  // -------------------------------------------------------------------------
  // 基础工具
  // -------------------------------------------------------------------------

  /** 回复目标：群里回群，私聊回人。 */
  function replyTarget(message: WechatInboundMessage) {
    return String(message.roomId || message.from || '').trim();
  }

  async function allowedTargets(): Promise<string[]> {
    const raw = (await deps.optionValue('wechat_allowed_users', '')).trim();
    if (!raw) return [];
    return raw.split(/[\s,，;；]+/).map((item) => item.trim()).filter(Boolean);
  }

  async function adminUserId(): Promise<number> {
    const admin = await deps.one<{ id: number }>(
      `select id from ${table('users')} where role = 'admin' order by id asc limit 1`,
    ).catch(() => null);
    return Number(admin?.id || 1);
  }

  /** 文章公开链接。跟发布通知用的是同一套 permalink 规则。 */
  async function postPublicUrl(postId: number): Promise<string> {
    const post = await deps.one<Record<string, unknown>>(
      `select p.*, coalesce((select m.slug from ${table('relationships')} r join ${table('metas')} m on m.id = r.meta_id
        where r.post_id = p.id and m.type = 'category' order by m.id asc limit 1), '') as category_slug
       from ${table('posts')} p where p.id = $1`, [postId],
    ).catch(() => null);
    if (!post) return '';
    const permalink = (await deps.optionValue('permalink_structure', '/posts/%postname%')).trim() || '/posts/%postname%';
    const timeZone = (await deps.optionValue('site_timezone', 'Asia/Shanghai')).trim() || 'Asia/Shanghai';
    const origin = String(await deps.optionValue('site_url', config.appUrl)).replace(/\/+$/, '');
    const path = deps.postPath(post, permalink, timeZone);
    return origin ? `${origin}${path}` : path;
  }

  function helpText() {
    return [
      'Utterlog 微信助手',
      '',
      '/publish          分步发布文章（标题 → 正文 → 确认）',
      '/reply <ID> <内容>  回复评论',
      '/comments         待审核评论列表',
      '/approve <ID>     通过评论',
      '/reject <ID>      拒绝评论',
      '/refresh          刷新 RSS 订阅源',
      '/stats            数据报告',
      '/ai <问题>        AI 问答',
      '',
      '直接发图片 → 上传到媒体库（发布流程中则作为封面）',
      '发布流程中：/publish_done 结束正文，/publish_confirm 确认发布，/publish_cancel 取消',
    ].join('\n');
  }

  // -------------------------------------------------------------------------
  // 图片处理
  // -------------------------------------------------------------------------

  async function downloadImage(url: string): Promise<{ bytes: Buffer; ext: string; mimeType: string }> {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`下载图片失败: HTTP ${res.status}`);
    const type = res.headers.get('content-type') || '';
    const bytes = Buffer.from(await res.arrayBuffer());
    let ext = (type.split('/')[1] || '').split(';')[0].trim().toLowerCase();
    if (!ext || ext === 'octet-stream') {
      ext = extname(new URL(url).pathname).replace('.', '').toLowerCase() || 'jpg';
    }
    if (ext === 'jpeg') ext = 'jpg';
    if (!['jpg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext)) ext = 'jpg';
    return { bytes, ext, mimeType: type || `image/${ext}` };
  }

  /** 图片进媒体库。返回可访问的 URL。 */
  async function saveImageToLibrary(url: string, folder = 'covers') {
    const { bytes, ext, mimeType } = await downloadImage(url);
    const stored = await deps.storeUploadedBytes(bytes, ext, mimeType, folder);
    const ts = deps.nowUnix();
    await deps.exec(
      `insert into ${table('media')} (name, filename, url, mime_type, size, driver, category, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,'image',$7,$7)`,
      [`wechat_photo.${ext}`, stored.relativePath, stored.url, mimeType, bytes.length, stored.driver, ts],
    ).catch(() => {});
    return stored;
  }

  // -------------------------------------------------------------------------
  // 评论审核
  // -------------------------------------------------------------------------

  async function approveComment(commentId: number) {
    const before = await deps.one<{ post_id: number; status: string }>(
      `select post_id, status from ${table('comments')} where id = $1`, [commentId],
    ).catch(() => null);
    if (!before) throw new Error('评论不存在');
    await deps.exec(`update ${table('comments')} set status = 'approved', updated_at = $1 where id = $2`, [deps.nowUnix(), commentId]);
    if (before.status !== 'approved') {
      await deps.exec(`update ${table('posts')} set comment_count = comment_count + 1 where id = $1`, [before.post_id]).catch(() => {});
    }
    return '评论已通过审核';
  }

  async function rejectComment(commentId: number) {
    const before = await deps.one<{ post_id: number; status: string }>(
      `select post_id, status from ${table('comments')} where id = $1`, [commentId],
    ).catch(() => null);
    if (!before) throw new Error('评论不存在');
    await deps.exec(`update ${table('comments')} set status = 'trash', updated_at = $1 where id = $2`, [deps.nowUnix(), commentId]);
    if (before.status === 'approved') {
      await deps.exec(`update ${table('posts')} set comment_count = greatest(comment_count - 1, 0) where id = $1`, [before.post_id]).catch(() => {});
    }
    return '评论已拒绝';
  }

  async function pendingCommentLines() {
    const rows = await deps.many<{ id: number; post_title: string; author_name: string; content: string; created_at: number }>(
      `select c.id, coalesce(p.title, '未知文章') as post_title, c.author_name, c.content, c.created_at
       from ${table('comments')} c left join ${table('posts')} p on p.id = c.post_id
       where c.status in ('pending','spam') order by c.created_at desc limit 8`,
    ).catch(() => []);
    if (!rows.length) return '没有待处理的评论。';
    const lines = [`待处理评论 ${rows.length} 条：`, ''];
    for (const row of rows) {
      lines.push(`#${row.id} 《${row.post_title}》 ${row.author_name || '访客'}`);
      lines.push(String(row.content || '').slice(0, 120));
      lines.push(`/reply ${row.id} 内容   /approve ${row.id}   /reject ${row.id}`);
      lines.push('');
    }
    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // 主入口
  // -------------------------------------------------------------------------

  async function processWechatInbound(input: WechatInboundMessage) {
    const from = String(input.from || '').trim();
    if (!from) throw new WechatServiceError(400, 'VALIDATION_ERROR', '缺少发送者 ID');

    const allowed = await allowedTargets();
    if (allowed.length && !allowed.includes(from) && !(input.roomId && allowed.includes(String(input.roomId)))) {
      return { ok: true, ignored: true, reason: 'not_allowed' };
    }

    const key = sessionKey(input);
    const target = replyTarget(input);
    const text = String(input.text || '').trim();
    const isImage = input.type === 'image' || Boolean(input.imageUrl);

    const reply = async (content: string) => {
      await deps.sendText(target, content);
      return content;
    };

    // 1) 读取会话状态：图片处理、命令分支都要用。
    const session = await getSession(key);

    // 2) 图片：发布流程中作为封面，否则进媒体库。
    if (isImage) {
      const imageUrl = String(input.imageUrl || '').trim();
      if (!imageUrl) {
        await reply('没有拿到图片地址，稍后再试一次。');
        return { ok: true };
      }
      try {
        const stored = await saveImageToLibrary(imageUrl, 'covers');
        if (session) {
          await setSession(key, { ...session, cover: stored.url });
          await reply(`图片已收到，将作为封面使用：\n${stored.url}\n\n继续按提示操作（/publish_done 结束正文，/publish_confirm 发布，/publish_cancel 取消）。`);
        } else {
          await reply(`图片已上传到媒体库：\n${stored.url}`);
        }
        return { ok: true };
      } catch (error) {
        await reply(`图片处理失败：${error instanceof Error ? error.message : '未知错误'}`);
        return { ok: true };
      }
    }

    if (!text) {
      await reply('收到空消息，发送 /help 查看可用命令。');
      return { ok: true };
    }

    // 3) 控制指令优先于会话状态：/publish_confirm 这类必须随时可用。
    const command = text.split(/\s+/)[0].toLowerCase();

    if (command === '/help' || command === '帮助' || command === '？' || command === '?') {
      await reply(helpText());
      return { ok: true };
    }

    if (command === '/cancel' || command === '/publish_cancel') {
      await setSession(key, null);
      await reply('已取消本次发布。');
      return { ok: true };
    }

    if (command === '/stats' || command === '/report' || command === '数据') {
      const report = await deps.buildDailyReport();
      await reply(report.lines.join('\n'));
      return { ok: true };
    }

    if (command === '/refresh' || command === '/feed' || command === '刷新订阅') {
      await reply('正在刷新 RSS 订阅源，请稍等…');
      try {
        const result = await deps.runFeedFetch({ force: true, trackProgress: true, cleanupOrphans: true });
        const failed = Number(result?.failed || 0);
        const failedUrls = Array.isArray(result?.failed_urls) ? result.failed_urls.slice(0, 5) : [];
        const lines = [
          '订阅源刷新完成',
          '',
          `订阅源: ${Number(result?.total || 0)}`,
          `抓取成功: ${Number(result?.fetched || 0)}`,
          `新增条目: ${Number(result?.new_items || 0)}`,
          `失败: ${failed}`,
          `清理无效订阅: ${Number(result?.pruned_subscriptions || 0)}`,
        ];
        if (failedUrls.length) {
          lines.push('', '失败明细（最近 5 条）：');
          for (const item of failedUrls) {
            const row = item as { feed_url?: string; error?: string };
            lines.push(`- ${row?.feed_url || ''} ${row?.error || ''}`);
          }
        }
        await reply(lines.join('\n'));
      } catch (error) {
        await reply(`刷新订阅失败：${error instanceof Error ? error.message : '未知错误'}`);
      }
      return { ok: true };
    }

    if (command === '/comments' || command === '/pending' || command === '待审评论') {
      await reply(await pendingCommentLines());
      return { ok: true };
    }

    if (command === '/approve' || command === '/reject') {
      const id = deps.intParam(text.split(/\s+/)[1] || '');
      if (!id) {
        await reply(`用法：${command} <评论ID>`);
        return { ok: true };
      }
      try {
        const result = command === '/approve' ? await approveComment(id) : await rejectComment(id);
        await reply(`${result}（#${id}）`);
      } catch (error) {
        await reply(error instanceof Error ? error.message : '操作失败');
      }
      return { ok: true };
    }

    if (command === '/reply') {
      const rest = text.replace(/^\/reply\s*/i, '').trim();
      const match = /^(\d+)\s+([\s\S]*)$/.exec(rest);
      if (!match) {
        await reply('用法：/reply <评论ID> <回复内容>');
        return { ok: true };
      }
      const commentId = deps.intParam(match[1]);
      const content = match[2].trim();
      if (!commentId || !content) {
        await reply('用法：/reply <评论ID> <回复内容>');
        return { ok: true };
      }
      try {
        const result = await deps.replyToAdminComment(commentId, await adminUserId(), { content });
        if (!result) {
          await reply(`评论 #${commentId} 不存在。`);
        } else {
          const notified = result.notified ? '（已邮件通知对方）' : '';
          await reply(`评论回复已发布${notified}（#${result.id}）`);
        }
      } catch (error) {
        await reply(`回复失败：${error instanceof Error ? error.message : '未知错误'}`);
      }
      return { ok: true };
    }

    if (command === '/ai') {
      const prompt = text.slice(3).trim();
      if (!prompt) {
        await reply('用法：/ai <你的问题>');
        return { ok: true };
      }
      const answer = await deps.callAiText([{ role: 'user', content: prompt }], 'chat', 0)
        .then((result) => result.content)
        .catch((error) => `AI 服务暂时不可用：${error instanceof Error ? error.message : '未知错误'}`);
      await reply(String(answer || '').slice(0, 4000));
      return { ok: true };
    }

    // 4) 引用回复：被引用的消息里带 #comment:<ID> 就当成回复该评论。
    const quoted = String(input.replyTo || '').trim();
    const quotedMatch = /#comment:(\d+)/i.exec(quoted);
    if (quotedMatch) {
      const commentId = deps.intParam(quotedMatch[1]);
      try {
        const result = await deps.replyToAdminComment(commentId, await adminUserId(), { content: text });
        await reply(result ? `评论回复已发布（#${result.id}）` : `评论 #${commentId} 不存在。`);
      } catch (error) {
        await reply(`回复失败：${error instanceof Error ? error.message : '未知错误'}`);
      }
      return { ok: true };
    }

    // 5) 分步发布流程。
    if (command === '/publish' || command === '发布文章') {
      await setSession(key, { stage: 'title' });
      await reply('好，开始写文章。\n\n请发送标题（直接发文字即可）：');
      return { ok: true };
    }

    // /publish_done 在没有会话时不该被当成普通文字（否则会误发一条说说）
    if (command === '/publish_done' && !session) {
      await reply('当前没有进行中的发布，先发 /publish 开始。');
      return { ok: true };
    }

    // /publish_confirm 必须在阶段分支之前处理：确认阶段的普通文字会被当成
    // 追加正文，放在后面的话这条确认指令会被自己吞掉。
    if (command === '/publish_confirm') {
      if (!session || session.stage !== 'confirm') {
        await reply('当前没有待发布的文章，先发 /publish 开始。');
        return { ok: true };
      }
      try {
        const postId = await deps.createPost({
          title: session.title,
          content: session.content,
          status: 'publish',
          cover_url: session.cover || undefined,
        }, await adminUserId());
        const url = await postPublicUrl(postId);
        await setSession(key, null);
        await reply([
          '文章已发布 🎉',
          '',
          `标题：${session.title}`,
          `ID：${postId}`,
          url ? `链接：${url}` : '',
        ].filter(Boolean).join('\n'));
      } catch (error) {
        await reply(`发布失败：${error instanceof Error ? error.message : '未知错误'}`);
      }
      return { ok: true };
    }

    // 标题阶段
    if (session?.stage === 'title') {
      if (command === '/publish_done') {
        await reply('先把标题发给我，然后再写正文。');
        return { ok: true };
      }
      await setSession(key, { stage: 'body', title: text });
      await reply(`标题：${text}\n\n请发送正文（支持 Markdown，长文可以分多条连续发送）。\n写完发 /publish_done 我就准备发布。`);
      return { ok: true };
    }

    // 正文阶段：除 /publish_done 外的文字都当作正文追加
    if (session?.stage === 'body') {
      if (command === '/publish_done') {
        const content = String(session.content || '').trim();
        if (!session.title || !content) {
          await reply('标题或正文还是空的，重新发 /publish 开始吧。');
          await setSession(key, null);
          return { ok: true };
        }
        await setSession(key, { ...session, stage: 'confirm' });
        const preview = content.slice(0, 200);
        await reply([
          '请确认发布：',
          '',
          `标题：${session.title}`,
          `字数：${content.length}`,
          session.cover ? `封面：${session.cover}` : '封面：未设置（可以现在发一张图片）',
          '',
          `正文开头：${preview}${content.length > 200 ? '…' : ''}`,
          '',
          '回复 /publish_confirm 发布，/publish_cancel 取消。',
        ].join('\n'));
        return { ok: true };
      }
      const content = [session.content, text].filter(Boolean).join('\n\n');
      await setSession(key, { ...session, content });
      await reply(`已收到正文 ${content.length} 字。继续发送可追加，发送 /publish_done 结束正文。`);
      return { ok: true };
    }

    // 确认阶段：除 /publish_confirm、/publish_cancel 外的文字都当作追加正文
    if (session?.stage === 'confirm') {
      if (command === '/publish_done') {
        await reply('正文已经写完了，回复 /publish_confirm 就能发布。');
        return { ok: true };
      }
      const content = [session.content, text].filter(Boolean).join('\n\n');
      await setSession(key, { ...session, content });
      await reply(`已追加 ${text.length} 字，现在共 ${content.length} 字。回复 /publish_confirm 发布，/publish_cancel 取消。`);
      return { ok: true };
    }

    // 6) 其它文本：如果是纯文字且不在流程中，当说说发出去（跟 Telegram 一致）。
    if (!session) {
      const publishMoment = (await deps.optionValue('wx_publish_moment', 'true')) !== 'false';
      if (publishMoment) {
        await deps.exec(
          `insert into ${table('moments')} (content, images, source, author_id, visibility, created_at, updated_at)
           values ($1, '{}'::text[], 'wechat', 1, 'public', $2, $2)`, [text, deps.nowUnix()],
        ).catch(() => {});
        await reply(`说说已发布\n\n${text}`);
        return { ok: true };
      }
    }

    await reply('这条我还没处理。发送 /help 查看可用命令。');
    return { ok: true };
  }

  /** 后台「测试连接」用：给主人发一条测试消息。 */
  async function testWechatConnection() {
    const owner = (await deps.optionValue('wechat_owner_id', '')).trim();
    if (!owner) throw new WechatServiceError(400, 'VALIDATION_ERROR', '请先填写「主人微信 ID」');
    const ok = await deps.sendText(owner, `Utterlog 微信测试消息 ${new Date().toLocaleString('zh-CN')}`);
    if (!ok) throw new WechatServiceError(502, 'GATEWAY_ERROR', '网关未返回成功，请检查网关地址与网络');
    return { sent: true };
  }

  /** 后台用：把已上传的图片发回给主人，验证发图链路。 */
  async function testWechatImage(url: string) {
    const owner = (await deps.optionValue('wechat_owner_id', '')).trim();
    if (!owner) throw new WechatServiceError(400, 'VALIDATION_ERROR', '请先填写「主人微信 ID」');
    const ok = await deps.sendImage(owner, url, 'Utterlog 图片测试');
    if (!ok) throw new WechatServiceError(502, 'GATEWAY_ERROR', '网关未返回成功，请检查网关地址与网络');
    return { sent: true };
  }

  return { processWechatInbound, testWechatConnection, testWechatImage };
}

/** 生产实例：真实依赖。 */
const bot = createWechatBot(realDeps);

export const processWechatInbound = bot.processWechatInbound;
export const testWechatConnection = bot.testWechatConnection;
export const testWechatImage = bot.testWechatImage;
