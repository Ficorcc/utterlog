'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CommentAvatar from '@/components/CommentAvatar';
import { commentFloorPage, loadApprovedComments } from '@/lib/comment-pages';
import { getVisitorId } from '@/lib/fingerprint';
import { useAuthStore } from '@/lib/store';
import emojiPack from '@/public/emoji/bilibili/pack-bilibili.json';
import {
  deviceIcon,
  IconChat,
  IconClose,
  IconHeart,
  IconLock,
  IconReply,
  IconShieldCheck,
  IconSmile,
} from './Icons';

/**
 * 文章评论区 —— 复刻原主题 comments.php 的 DOM 契约。
 *
 * 结构：
 *   .cmt-section
 *     .cmt-section-head → h3.cmt-title（图标 + N条评论）
 *     .cmt-form-area
 *       .cmt-reply-bar   （回复某条时出现）
 *       .cmt-form → form
 *         .cmt-fields        （昵称 / 邮箱 / 网址）
 *         .cmt-textarea-wrap
 *         .cmt-form-bar
 *           .cmt-form-left   （校验徽标 / 私密开关 / 表情 / 快捷键提示）
 *           button.cmt-submit
 *       .cmt-emoji-panel
 *     ol.cmt-list
 *       li.cmt-item
 *         .cmt-card
 *           .cmt-avatar-col → img.cmt-avatar
 *           .cmt-body
 *             .cmt-header（.cmt-user / .cmt-floor / .cmt-time）
 *             .cmt-text
 *             .cmt-actions（点赞 / 回复 / 设备徽章）
 *         ol.cmt-children → li.cmt-item.cmt-is-child
 *
 * 样式全部来自 styles.css 里已移植好的 .cmt-* 规则，这里只负责结构与交互。
 */

interface Comment {
  id: number;
  post_id?: number;
  parent_id?: number;
  author?: string;
  email?: string;
  url?: string;
  user_agent?: string;
  client_hints?: string;
  content: string;
  status?: string;
  avatar_url?: string;
  avatar_candidates?: string[];
  is_admin?: boolean;
  level?: number;
  friend?: { name: string; url: string } | null;
  created_at: number;
  children?: Comment[];
  floor?: number;
  /** 服务端点赞态：liked 是「我点过赞」，like_count 是总赞数。 */
  liked?: boolean;
  like_count?: number;
  /** 私密评论：masked 表示正文已被服务端遮罩（我不是作者也不是站长）。 */
  is_private?: boolean;
  masked?: boolean;
}

const USER_KEY = 'comment_user';

/* ── 人机校验（PoW） ──────────────────────────────────────────────────── */

async function sha256(message: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function solvePoW(challenge: string, difficulty: number): Promise<string> {
  const prefix = '0'.repeat(difficulty);
  let nonce = 0;
  while (true) {
    for (let i = 0; i < 1000; i++) {
      const n = String(nonce);
      if ((await sha256(challenge + n)).startsWith(prefix)) return n;
      nonce++;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

type CaptchaState = 'idle' | 'solving' | 'ok' | 'fail' | 'off';

interface Captcha {
  state: CaptchaState;
  challenge: string;
  nonce: string;
}

/* ── 设备识别 ─────────────────────────────────────────────────────────── */

interface Device {
  os: string;
  browser: string;
}

function parseClientHints(raw: string | undefined): Device {
  if (!raw) return { os: '', browser: '' };
  try {
    const data = JSON.parse(raw);
    const platform = String(data.platform || '').toLowerCase();
    const os = /iphone|ipad|ios/.test(platform)
      ? 'iOS'
      : /android/.test(platform)
        ? 'Android'
        : /mac/.test(platform)
          ? 'macOS'
          : /win/.test(platform)
            ? 'Windows'
            : /linux/.test(platform)
              ? 'Linux'
              : '';
    return { os, browser: String(data.browser || '') };
  } catch {
    return { os: '', browser: '' };
  }
}

function parseUA(ua: string | undefined): Device {
  const value = String(ua || '');
  if (!value) return { os: '', browser: '' };
  let os = '';
  if (/iPhone|iPad/i.test(value)) os = 'iOS';
  else if (/Android/i.test(value)) os = 'Android';
  else if (/Windows/i.test(value)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(value)) os = 'macOS';
  else if (/Linux/i.test(value)) os = 'Linux';
  let browser = '';
  if (/Edg\//.test(value)) browser = 'Edge';
  else if (/Chrome\//.test(value)) browser = 'Chrome';
  else if (/Firefox\//.test(value)) browser = 'Firefox';
  else if (/Safari\//.test(value)) browser = 'Safari';
  return { os, browser };
}

function deviceOf(comment: Comment): Device {
  const hints = parseClientHints(comment.client_hints);
  if (hints.os || hints.browser) return hints;
  return parseUA(comment.user_agent);
}

/* ── 相对时间（原站「19天前」这种写法） ──────────────────────────────── */

function timeAgo(timestamp: number | string | undefined): string {
  const value = Number(timestamp || 0);
  if (!value) return '';
  const diff = Date.now() - value * 1000;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}天前`;
  if (diff < 31_536_000_000) return `${Math.floor(diff / 2_592_000_000)}个月前`;
  const date = new Date(value * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/* ── 评论正文渲染 ─────────────────────────────────────────────────────── */

const emojiMap = new Map(emojiPack.emojis.map((item) => [item.slug, item]));

/** 把正文里的 [:slug:] 还原成表情图片，其余按纯文本输出（外链统一走 /go 确认页）。 */
function renderContent(content: string, keyBase: string) {
  const nodes: React.ReactNode[] = [];
  const parts = String(content || '').split(/(\[:[\w]+:\])/g);
  parts.forEach((part, index) => {
    const match = part.match(/^\[:([\w]+):\]$/);
    if (match) {
      const emoji = emojiMap.get(match[1]);
      if (emoji) {
        nodes.push(
          <img
            key={`${keyBase}-e${index}`}
            src={`/emoji/bilibili/${emoji.file}`}
            alt={emoji.name}
            title={emoji.name}
            style={{ width: '22px', height: '22px', verticalAlign: 'middle', display: 'inline-block', margin: '0 1px' }}
          />,
        );
        return;
      }
    }
    // @提及 单独包一层，原站用 .cmt-mention 高亮。
    // 用否定回顾断言排除邮箱（xxx@yy.com 里的 @ 不是提及）。
    const chunks = part.split(/(?<![\w@])@[^\s@]{1,20}/g);
    chunks.forEach((chunk, chunkIndex) => {
      if (chunk.startsWith('@') && chunk.length > 1) {
        nodes.push(
          <span key={`${keyBase}-m${index}-${chunkIndex}`} className="cmt-mention">
            {chunk}
          </span>,
        );
      } else if (chunk) {
        nodes.push(
          <span key={`${keyBase}-t${index}-${chunkIndex}`}>{chunk}</span>,
        );
      }
    });
  });
  return nodes;
}

/* ── 表情面板 ─────────────────────────────────────────────────────────── */

const SYMBOLS = [
  '😀','😄','😁','😊','🙂','😉','😍','🥰','😘','😗','😋','😛','🤪','🤗','🤔','🤨',
  '😐','😑','😶','😏','😒','🙄','😬','😴','😷','🤒','🥳','😎','🤓','🥺','😢','😭',
  '😤','😠','😡','🤯','😳','🥵','🥶','😱','😨','😰','😥','🤤','🤡','👻','💀','👽',
];

const EMOJI_TABS = [
  { key: 'face', label: '表情' },
  { key: 'symbol', label: '符号' },
] as const;

type EmojiTab = (typeof EMOJI_TABS)[number]['key'];

/* ── 组件 ─────────────────────────────────────────────────────────────── */

export default function PostComments({ postId, initialCount }: { postId: number; initialCount?: number }) {
  const { user, accessToken } = useAuthStore();
  const isAdmin = Boolean(accessToken && user);

  const [comments, setComments] = useState<Comment[]>([]);
  const [roots, setRoots] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [captcha, setCaptcha] = useState<Captcha>({ state: 'idle', challenge: '', nonce: '' });
  const [replyTo, setReplyTo] = useState<{ id: number; author: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab] = useState<EmojiTab>('face');
  const [likes, setLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [isPrivate, setIsPrivate] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  /* 读取评论 —— 按时间升序取全量，楼层号按升序分配，展示时倒序（对齐原站）。
     带上本机 visitor_id：私密评论只有作者本人看得到正文，服务端靠它认人。 */
  const load = useCallback(async () => {
    if (!postId) return;
    try {
      const list = await loadApprovedComments<Comment>(postId, 'asc', getVisitorId());
      list.forEach((item, index) => {
        item.floor = index + 1;
      });
      setComments(list);
      // 点赞态用服务端返回的（cookie 里的访客身份决定「我点过赞」）。
      const likeState: Record<string, { liked: boolean; count: number }> = {};
      list.forEach((item) => {
        likeState[String(item.id)] = { liked: Boolean(item.liked), count: Number(item.like_count || 0) };
      });
      setLikes(likeState);
      const map = new Map<number, Comment>();
      list.forEach((item) => map.set(item.id, { ...item, children: [] }));
      const top: Comment[] = [];
      list.forEach((item) => {
        const node = map.get(item.id)!;
        const parentId = Number(item.parent_id || 0);
        if (parentId > 0 && map.has(parentId)) {
          map.get(parentId)!.children!.push(node);
        } else {
          top.push(node);
        }
      });
      // 原站：新的在上、旧的在下；子回复同样倒序。
      top.reverse();
      top.forEach((node) => node.children?.reverse());
      setRoots(top);
    } catch {
      /* 列表加载失败时保持空态 */
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  /**
   * 卡片入场动画。
   *
   * .cmt-card / .cmt-item 在 CSS 里默认 opacity:0，要等 JS 补上 .card-visible
   * 才会走 cardFadeIn 显形（和原站 main.v2.js 的做法一致）。这里自己盯一次
   * 列表容器：元素滚进视口时才点亮，避免整段评论在页面加载时就全部亮起来。
   */
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.cmt-item, .cmt-card'));
    if (!nodes.length) return;
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('card-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('card-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '120px 0px', threshold: 0.02 },
    );
    nodes.forEach((node, index) => {
      node.style.animationDelay = `${Math.min(index, 10) * 0.04}s`;
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, [roots, page]);

  /* 表单预填：管理员用登录资料，其它访客用本机记住的评论资料。 */
  useEffect(() => {
    if (isAdmin && user) {
      setName(user.nickname || user.username || '');
      setEmail(user.email || '');
      return;
    }
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.name) setName(String(data.name));
      if (data.email) setEmail(String(data.email));
      if (data.url) setUrl(String(data.url));
    } catch {
      /* 本地资料坏了就当没有 */
    }
  }, [isAdmin, user]);

  /* PoW 校验：进入页面就自动算好，提交时直接用（原站也是「无需点击」）。 */
  const solveCaptcha = useCallback(async () => {
    if (isAdmin) {
      setCaptcha({ state: 'off', challenge: '', nonce: '' });
      return;
    }
    try {
      const res: any = await api.get('/captcha/challenge');
      const data = res.data || res;
      if (data.enabled === false || data.mode === 'off') {
        setCaptcha({ state: 'off', challenge: '', nonce: '' });
        return;
      }
      if (data.mode !== 'pow') {
        setCaptcha({ state: 'off', challenge: '', nonce: '' });
        return;
      }
      setCaptcha({ state: 'solving', challenge: '', nonce: '' });
      const nonce = await solvePoW(String(data.challenge || ''), Number(data.difficulty || 4));
      setCaptcha({ state: 'ok', challenge: String(data.challenge || ''), nonce });
    } catch {
      setCaptcha({ state: 'fail', challenge: '', nonce: '' });
    }
  }, [isAdmin]);

  useEffect(() => {
    solveCaptcha();
  }, [solveCaptcha]);

  /* 分页：按主楼分页（每页 10 条主楼），与共享组件口径一致。
     roots 已经是「新在上」倒序，所以切片按 oldest 走（即从数组头开始）。 */
  const paged = useMemo(() => commentFloorPage(roots, page, 'oldest'), [roots, page]);
  const totalPages = paged.totalPages;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /** 点赞：走服务端（POST /comments/:id/like），访客身份在 cookie 里。 */
  const toggleLike = async (comment: Comment) => {
    const key = String(comment.id);
    const current = likes[key] || { liked: false, count: 0 };
    // 先本地翻转，接口回来再按服务端结果校正（点快了也不会卡住）。
    setLikes((prev) => ({ ...prev, [key]: { liked: !current.liked, count: current.count + (current.liked ? -1 : 1) } }));
    try {
      const res: any = await api.post(`/comments/${comment.id}/like`);
      const data = res?.data || res;
      setLikes((prev) => ({
        ...prev,
        [key]: { liked: Boolean(data?.liked), count: Number(data?.like_count || 0) },
      }));
    } catch (err: any) {
      setLikes((prev) => ({ ...prev, [key]: current }));
      toast.error(err?.response?.data?.message || '点赞失败，请稍后再试');
    }
  };

  const startReply = (comment: Comment) => {
    setReplyTo({ id: comment.id, author: comment.author || '匿名' });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => textareaRef.current?.focus(), 320);
  };

  const cancelReply = () => {
    setReplyTo(null);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const insertEmoji = (token: string) => {
    const el = textareaRef.current;
    const value = `${content}${token}`;
    setContent(value);
    if (!el) return;
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = start + token.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next, next);
    });
  };

  const handleSubmit = async () => {
    const nickname = name.trim();
    const mail = email.trim();
    const text = content.trim();
    if (!nickname) {
      toast.error('请填写昵称');
      return;
    }
    if (!mail) {
      toast.error('请填写邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      toast.error('邮箱格式不正确');
      return;
    }
    if (!text) {
      toast.error('请填写评论内容');
      return;
    }
    if ([...text].length < 5) {
      toast.error('评论内容至少 5 个字');
      return;
    }
    if (!isAdmin && captcha.state !== 'ok' && captcha.state !== 'off') {
      toast.error('人机校验还没完成，请稍候再提交');
      return;
    }

    setSubmitting(true);
    try {
      let clientHints = '';
      try {
        const uad = (navigator as any).userAgentData;
        if (uad?.getHighEntropyValues) {
          const h = await uad.getHighEntropyValues(['platform', 'platformVersion', 'fullVersionList', 'mobile']);
          let browserName = '';
          let browserVersion = '';
          if (h.fullVersionList) {
            const real = h.fullVersionList.find((b: any) => !b.brand.startsWith('Not') && b.brand !== 'Chromium');
            if (real) {
              browserName = real.brand.replace('Google Chrome', 'Chrome').replace('Microsoft Edge', 'Edge');
              browserVersion = real.version;
            }
          }
          clientHints = JSON.stringify({
            platform: h.platform || '',
            platformVersion: h.platformVersion || '',
            browser: browserName,
            browserVersion,
            mobile: !!h.mobile,
          });
        }
      } catch {
        /* 拿不到 Client Hints 就退化成 UA 解析 */
      }

      const res: any = await api.post('/comments', {
        post_id: postId,
        parent_id: replyTo?.id || 0,
        author: nickname,
        email: mail,
        url: url.trim() || undefined,
        content: text,
        visitor_id: getVisitorId(),
        client_hints: clientHints || undefined,
        // 私密评论：服务端按 visitor_id 认作者，只有作者本人和站长看得到正文。
        private: isPrivate,
        captcha_challenge: captcha.challenge || '',
        captcha_nonce: captcha.nonce || '',
        captcha_id: '',
        captcha_code: '',
      });

      try {
        localStorage.setItem(USER_KEY, JSON.stringify({ name: nickname, email: mail, url: url.trim() }));
      } catch {
        /* 存不下就算了 */
      }

      const status = res?.status || res?.data?.status;
      if (status === 'spam') {
        toast('评论未能通过自动过滤，如有误判请通过邮件联系站长', { icon: '⚠️', duration: 6000 });
      } else if (status === 'approved') {
        toast.success('评论已发布');
      } else {
        toast.success('评论已提交，审核通过后将显示');
      }

      setContent('');
      setReplyTo(null);
      await load();
      await solveCaptcha();
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.response?.data?.message || '评论提交失败';
      toast.error(message);
      await solveCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!submitting) handleSubmit();
    }
  };

  const copyFloorLink = async (comment: Comment) => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('评论链接已复制');
    } catch {
      toast('复制失败，请手动复制地址栏');
    }
  };

  const captchaText =
    captcha.state === 'ok'
      ? '已就绪'
      : captcha.state === 'solving'
        ? '验证中…'
        : captcha.state === 'fail'
          ? '验证失败'
          : captcha.state === 'off'
            ? '无需验证'
            : '正在验证…';

  const renderComment = (comment: Comment, isChild: boolean) => {
    const device = deviceOf(comment);
    const like = likes[String(comment.id)] || { liked: Boolean(comment.liked), count: Number(comment.like_count || 0) };
    const liked = like.liked;
    const likeCount = like.count;
    const nameText = comment.author || '匿名';
    return (
      <li
        key={comment.id}
        id={`li-comment-${comment.id}`}
        className={`cmt-item${isChild ? ' cmt-is-child' : ''}${comment.is_admin ? ' cmt-is-admin' : ''}`}
        data-coid={comment.id}
      >
        <div className="cmt-card" id={`comment-${comment.id}`}>
          <div className="cmt-avatar-col">
            <CommentAvatar
              name={nameText}
              candidates={comment.avatar_candidates}
              src={comment.avatar_url}
              size={isChild ? 22 : 32}
              className="cmt-avatar"
              alt=""
            />
          </div>
          <div className="cmt-body">
            <div className="cmt-header">
              <div className="cmt-user">
                <span className="cmt-name">
                  {comment.url ? (
                    <a href={comment.url} target="_blank" rel="external nofollow noopener">
                      {nameText}
                    </a>
                  ) : (
                    nameText
                  )}
                </span>
                {comment.is_admin ? <span className="cmt-tag cmt-tag-admin">站长</span> : null}
                {comment.friend ? <span className="cmt-tag cmt-tag-friend">好友</span> : null}
                {comment.is_private ? (
                  <span className="cmt-tag cmt-tag-private" title="私密评论：仅站长与作者本人可见">
                    <IconLock size={8} style={{ marginRight: '1px' }} /> 私密
                  </span>
                ) : null}
                {comment.level && comment.level > 0 ? (
                  <span className="cmt-tag cmt-tag-lv">Lv{comment.level}</span>
                ) : null}
              </div>
              {isChild ? null : (
                <button
                  type="button"
                  className="cmt-floor"
                  data-cid={`comment-${comment.id}`}
                  title="复制评论链接"
                  onClick={() => copyFloorLink(comment)}
                >
                  #{comment.floor}
                </button>
              )}
              <time className="cmt-time">{timeAgo(comment.created_at)}</time>
            </div>
            {comment.masked ? (
              // 私密评论的正文被服务端遮罩了 —— 这里只渲染打码骨架（原站 .cmt-mosaic）。
              <div className="cmt-text-masked">
                <div className="cmt-mosaic">
                  <span className="cmt-mosaic-bar cmt-mosaic-bar-1" />
                  <span className="cmt-mosaic-bar cmt-mosaic-bar-2" />
                  <span className="cmt-mosaic-hint">
                    <IconLock size={10} /> 这是一条私密评论
                  </span>
                </div>
              </div>
            ) : (
              <div className="cmt-text">
                <p>{renderContent(comment.content, `c${comment.id}`)}</p>
              </div>
            )}
            <div className="cmt-actions">
              <button
                type="button"
                className={`cmt-like-btn${liked ? ' liked' : ''}`}
                data-coid={comment.id}
                data-likes={likeCount}
                title="点赞"
                onClick={() => toggleLike(comment)}
              >
                <IconHeart size={11} />
                <span className="cmt-like-text">点赞</span>
                <span className="cmt-like-count">{likeCount > 0 ? likeCount : ''}</span>
              </button>
              <a
                href="javascript:;"
                className="cmt-reply-btn"
                data-cid={`comment-${comment.id}`}
                data-coid={comment.id}
                title="回复这条评论"
                onClick={(event) => {
                  event.preventDefault();
                  startReply(comment);
                }}
              >
                <IconReply size={11} /> 回复
              </a>
              {device.os ? (
                <span className="cmt-device" title="评论设备">
                  {deviceIcon(device.os, 12, 'cmt-dev-icon')}
                  <span className="cmt-device-os">{device.os}</span>
                  {device.browser ? (
                    <>
                      <span className="cmt-device-dot" />
                      <span className="cmt-device-br">{device.browser}</span>
                    </>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {comment.children && comment.children.length ? (
          <ol className="cmt-children">
            {comment.children.map((child) => renderComment(child, true))}
          </ol>
        ) : null}
      </li>
    );
  };

  // 评论总数：列表拉到之前先用文章自带的 comment_count 占位，
  // 避免首屏闪一下「0条评论」。
  const total = comments.length || Number(initialCount || 0);

  return (
    <div className="cmt-section" id="comments">
      <div className="cmt-section-head">
        <h3 className="cmt-title">
          <IconChat size={14} /> {total}条评论
        </h3>
      </div>

      <div className="cmt-form-area" id={`respond-post-${postId}`}>
        <div className={`cmt-reply-bar${replyTo ? ' show' : ''}`} id="cmt-reply-bar">
          <div className="cmt-reply-inner">
            <IconReply size={12} />
            <span id="cmt-reply-info">
              {replyTo ? (
                <>
                  正在回复 <strong>{replyTo.author}</strong>
                </>
              ) : (
                ''
              )}
            </span>
            <button type="button" className="cmt-cancel-btn" id="cmt-cancel-btn" onClick={cancelReply}>
              <IconClose size={11} />
            </button>
          </div>
        </div>

        <div className="cmt-form" id="cmt-form-wrap" ref={formRef}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <input type="hidden" name="parent" id="comment-parent" value={replyTo?.id || ''} />
            <div className="cmt-fields">
              <input
                type="text"
                name="author"
                placeholder="昵称 *"
                value={name}
                maxLength={50}
                required
                onChange={(event) => setName(event.target.value)}
              />
              <input
                type="email"
                name="mail"
                placeholder="邮箱 *"
                value={email}
                maxLength={100}
                required
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                type="url"
                name="url"
                placeholder="网址"
                value={url}
                maxLength={100}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
            <div className="cmt-textarea-wrap">
              <textarea
                name="text"
                rows={3}
                placeholder="说点什么吧…"
                value={content}
                required
                ref={textareaRef}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="cmt-form-bar">
              <div className="cmt-form-left">
                <span className="vf-pill" id="vf-pill" data-state={captcha.state} title="提交时自动完成人机校验，无需点击">
                  <IconShieldCheck size={11} className="vf-icon" />
                  <span className="vf-text">{captchaText}</span>
                </span>
                <label
                  className="cmt-private-toggle"
                  title="勾选后仅站长和你本人可见"
                >
                  <input
                    type="checkbox"
                    name="private"
                    value="1"
                    id="comment-private"
                    checked={isPrivate}
                    onChange={(event) => setIsPrivate(event.target.checked)}
                  />
                  <span className="cmt-private-pill">
                    <IconLock size={11} />
                    <span>私密</span>
                  </span>
                </label>
                <button
                  type="button"
                  className="cmt-emoji-btn"
                  id="cmt-emoji-btn"
                  title="表情"
                  onClick={() => setShowEmoji((value) => !value)}
                >
                  <IconSmile size={15} />
                </button>
                <span className="cmt-hint">Ctrl + Enter 发送</span>
              </div>
              <button type="submit" className="cmt-submit" id="comment-submit" disabled={submitting}>
                {submitting ? '提交中…' : '提交评论'}
              </button>
            </div>
          </form>
        </div>

        <div
          className={`cmt-emoji-panel${showEmoji ? ' cmt-emoji-panel--in' : ''}`}
          id="cmt-emoji-panel"
          style={{ display: showEmoji ? 'block' : 'none' }}
        >
          <div className="cmt-emoji-tabs">
            {EMOJI_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`cmt-emoji-tab${emojiTab === tab.key ? ' active' : ''}`}
                onClick={() => setEmojiTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="cmt-emoji-grid">
            <div className="cmt-emoji-cat" hidden={emojiTab !== 'face'}>
              {emojiPack.emojis.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  className="cmt-emoji-item"
                  title={item.name}
                  onClick={() => insertEmoji(`[:${item.slug}:]`)}
                >
                  <img
                    src={`/emoji/bilibili/${item.file}`}
                    alt={item.name}
                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                  />
                </button>
              ))}
            </div>
            <div className="cmt-emoji-cat" hidden={emojiTab !== 'symbol'}>
              {SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  className="cmt-emoji-item"
                  onClick={() => insertEmoji(symbol)}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="cmt-empty">
          <p>评论加载中…</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="cmt-empty">
          <IconChat size={32} />
          <p>还没有评论，来说点什么吧~</p>
        </div>
      ) : (
        <>
          <ol className="cmt-list" ref={listRef}>
            {paged.floors.map(({ comment }) => renderComment(comment, false))}
          </ol>
          {totalPages > 1 ? (
            <div className="pagination">
              <ol>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                  <li key={number} className={number === page ? 'current' : ''}>
                    {number === page ? <span>{number}</span> : <a href={`#comments-page-${number}`} onClick={(event) => { event.preventDefault(); setPage(number); }}>{number}</a>}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
