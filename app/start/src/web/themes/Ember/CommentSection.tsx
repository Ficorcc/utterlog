'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import CommentAvatar from '@/components/CommentAvatar';
import CommentForm from '@/components/blog/CommentForm';
import { loadApprovedComments } from '@/lib/comment-pages';
import { formatDateTimeInTimeZone } from '@/lib/timezone';
import { useThemeContext } from '@/lib/theme-context';
import emojiPack from '@/public/emoji/bilibili/pack-bilibili.json';

interface EmojiEntry {
  slug: string;
  name: string;
  file: string;
}

const emojiMap = new Map<string, EmojiEntry>(
  emojiPack.emojis.map((e) => [e.slug, e] as [string, EmojiEntry]),
);

/** 主楼一批展示多少条，剩下的交给「加载更多评论」按钮 */
const FLOOR_STEP = 10;

interface CommentGeo {
  country_code?: string;
  country?: string;
  province?: string;
  city?: string;
}

interface EmberComment {
  id: number;
  parent_id?: number;
  author: string;
  email?: string;
  url?: string;
  ip?: string;
  content: string;
  avatar_url?: string;
  avatar_candidates?: string[];
  geo?: CommentGeo;
  is_admin?: boolean;
  created_at: number;
  children?: EmberComment[];
}

/* ---------- 评论正文渲染：表情 + 裸链（外链统一经 /go 确认页跳转） ---------- */

const URL_RE = /https?:\/\/[^\s<>（）【】“”，。；！？、]+/g;

function linkify(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const raw = match[0];
    const url = raw.replace(/[.,;:!?)"']+$/, '');
    if (/^https?:\/\/\S+$/.test(url)) {
      nodes.push(
        <a key={`${keyBase}-${match.index}`} className="comment-content-link" href={`/go?url=${encodeURIComponent(url)}`} rel="noopener noreferrer">
          {url}
        </a>,
      );
      if (url.length < raw.length) nodes.push(raw.slice(url.length));
    } else {
      nodes.push(raw);
    }
    last = match.index + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderContent(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\[:(\w+):\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > last) nodes.push(...linkify(content.slice(last, match.index), `pre-${match.index}`));
    const emoji = emojiMap.get(match[1]);
    if (emoji) {
      nodes.push(
        <img key={`emoji-${match.index}`} className="comment-emoji" src={`/emoji/bilibili/${emoji.file}`} alt={emoji.name} title={emoji.name} />,
      );
    } else {
      nodes.push(match[0]);
    }
    last = regex.lastIndex;
  }
  if (last < content.length) nodes.push(...linkify(content.slice(last), 'tail'));
  return nodes;
}

/* ---------- 树形结构与工具函数 ---------- */

function buildTree(comments: EmberComment[]): EmberComment[] {
  const map = new Map<number, EmberComment>();
  const roots: EmberComment[] = [];
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  comments.forEach((c) => {
    const node = map.get(c.id)!;
    const parentId = Number(c.parent_id || 0);
    const parent = parentId > 0 ? map.get(parentId) : undefined;
    if (parent) parent.children!.push(node);
    else roots.push(node);
  });
  return roots;
}

/** 把主楼下面的所有回复摊平成一层，跟上游的嵌套列表一致 */
function flattenReplies(node: EmberComment): { comment: EmberComment; parent: EmberComment }[] {
  const result: { comment: EmberComment; parent: EmberComment }[] = [];
  const walk = (current: EmberComment, parent: EmberComment) => {
    for (const child of current.children || []) {
      result.push({ comment: child, parent: current });
      walk(child, current);
    }
  };
  walk(node, node);
  return result;
}

function commentLocation(geo?: CommentGeo): string {
  if (!geo) return '';
  const region = [geo.province, geo.city].map((part) => String(part || '').trim()).filter(Boolean);
  const place = region.filter((part, index) => index === 0 || part !== region[index - 1]);
  if (place.length > 0) return place.join(' · ');
  return String(geo.country || '').trim();
}

function relativeTime(ts: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

/** 评论者信息的主键：优先邮箱，其次 IP，最后昵称 */
function participantKey(comment: EmberComment): string {
  const email = String(comment.email || '').trim();
  if (email) return `email:${email.toLowerCase()}`;
  const ip = String(comment.ip || '').trim();
  if (ip) return `ip:${ip}`;
  const name = String(comment.author || '').trim();
  return name ? `name:${name}` : '';
}

/* ---------- 单条评论 ---------- */

function CommentItem({
  comment,
  parentAuthor,
  isReply,
  postId,
  timeZone,
  replyTargetId,
  onToggleReply,
  onSubmitSuccess,
  children,
}: {
  comment: EmberComment;
  parentAuthor?: string;
  isReply?: boolean;
  postId: number;
  timeZone: string;
  replyTargetId: number | null;
  onToggleReply: (comment: EmberComment) => void;
  onSubmitSuccess: () => void;
  children?: ReactNode;
}) {
  const location = commentLocation(comment.geo);
  const replying = replyTargetId === comment.id;
  const fullTime = comment.created_at
    ? formatDateTimeInTimeZone(
        comment.created_at * 1000,
        'zh-CN',
        { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false },
        timeZone,
      )
    : '';

  return (
    <li
      className={`comment-item${isReply ? ' comment-reply' : ''}${replying ? ' is-replying' : ''}`}
      data-id={comment.id}
      id={`comment-${comment.id}`}
    >
      <CommentAvatar
        className="comment-avatar"
        name={comment.author}
        candidates={comment.avatar_candidates}
        src={comment.avatar_url}
        size={isReply ? 28 : 32}
        alt={comment.author}
      />
      <div className="comment-body">
        <div className="comment-meta">
          {comment.url ? (
            <a className="comment-author-link" href={comment.url} target="_blank" rel="nofollow noopener">
              <strong>{comment.author}</strong>
            </a>
          ) : (
            <strong className="comment-author">{comment.author}</strong>
          )}
          {comment.is_admin ? (
            <span className="comment-admin-badge">
              <i className="fa-solid fa-crown" aria-hidden="true" /> 博主
            </span>
          ) : null}
          {isReply && parentAuthor ? (
            <>
              <span className="reply-arrow" aria-hidden="true">›</span>
              <span className="reply-target">{parentAuthor}</span>
            </>
          ) : null}
          <span className="comment-time" title={fullTime}>· {relativeTime(comment.created_at)}</span>
          {location ? <span className="comment-location" title={`IP 属地：${location}`}>· {location}</span> : null}
          <button type="button" className="comment-reply-btn" onClick={() => onToggleReply(comment)}>
            回复
          </button>
        </div>
        <div className="comment-content">{renderContent(comment.content)}</div>
        {replying ? (
          <div className="comment-reply-form">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              compact
              onCancel={() => onToggleReply(comment)}
              onSuccess={onSubmitSuccess}
            />
          </div>
        ) : null}
      </div>
      {children}
    </li>
  );
}

/* ---------- 评论区 ---------- */

export default function CommentSection({ postId, title }: { postId: number; title?: string }) {
  const { options, timeZone } = useThemeContext();
  const [comments, setComments] = useState<EmberComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleFloors, setVisibleFloors] = useState(FLOOR_STEP);
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [order, setOrder] = useState<'oldest' | 'newest'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('comment_order');
      if (saved === 'newest' || saved === 'oldest') return saved;
    }
    const fromAdmin = options?.comment_order;
    if (fromAdmin === 'newest' || fromAdmin === 'oldest') return fromAdmin;
    return 'oldest';
  });
  const requestVersion = useRef(0);

  const fetchComments = useCallback(
    async (mode: 'initial' | 'silent' = 'initial') => {
      const version = ++requestVersion.current;
      if (mode === 'initial') setLoading(true);
      try {
        const data = await loadApprovedComments<EmberComment>(postId, order === 'oldest' ? 'asc' : 'desc');
        if (version !== requestVersion.current) return;
        setComments(data);
      } catch {
        if (version === requestVersion.current) setComments([]);
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [postId, order],
  );

  useEffect(() => {
    setVisibleFloors(FLOOR_STEP);
    fetchComments('initial');
  }, [fetchComments]);

  const tree = useMemo(() => buildTree(comments), [comments]);

  // 接口已经按 order 排好序（asc = 最早优先，desc = 最新优先），这里只截取前几屏
  const floors = useMemo(() => tree.slice(0, visibleFloors), [tree, visibleFloors]);

  const hasMore = tree.length > floors.length;

  // 参与人数按评论者去重（邮箱 → IP → 昵称），跟上游口径一致
  const participants = useMemo(() => {
    const keys = new Set<string>();
    for (const comment of comments) {
      const key = participantKey(comment);
      if (key) keys.add(key);
    }
    return keys.size;
  }, [comments]);

  // 带上 #comment-xxx 的外链进来时，定位到那条评论
  useEffect(() => {
    if (loading || comments.length === 0) return;
    const id = Number(window.location.hash.match(/^#comment-(\d+)$/)?.[1]);
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [loading, comments]);

  const toggleReply = useCallback((comment: EmberComment) => {
    setReplyTargetId((prev) => (prev === comment.id ? null : comment.id));
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    setReplyTargetId(null);
    fetchComments('silent');
  }, [fetchComments]);

  const toggleOrder = useCallback(() => {
    setOrder((prev) => {
      const next = prev === 'newest' ? 'oldest' : 'newest';
      localStorage.setItem('comment_order', next);
      return next;
    });
  }, []);

  return (
    <section className="comments" id="comments">
      <h3>
        <span className="comments-title-label">
          <i className="fa-regular fa-comment" aria-hidden="true" />
          <span>{title || ''}</span>
        </span>
        <span className="comments-title-stats">
          <span><i className="fa-solid fa-people-group" aria-hidden="true" />{participants} 人参与</span>
          <span><i className="fa-regular fa-comment" aria-hidden="true" />{comments.length} 条评论</span>
        </span>
      </h3>

      {comments.length > 0 ? (
        <div className="comment-toolbar">
          <button type="button" className="comment-order-toggle" onClick={toggleOrder}>
            <i className={`fa-regular ${order === 'newest' ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-wide-short'}`} aria-hidden="true" />
            {order === 'newest' ? '最新' : '最早'}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="comment-loading">评论加载中…</div>
      ) : (
        <ul className="comment-list">
          {floors.map((comment) => {
            const replies = flattenReplies(comment);
            return (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                timeZone={timeZone}
                replyTargetId={replyTargetId}
                onToggleReply={toggleReply}
                onSubmitSuccess={handleSubmitSuccess}
              >
                {replies.length > 0 ? (
                  <ul className="comment-reply-list">
                    {replies.map(({ comment: reply, parent }) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        parentAuthor={parent.author}
                        isReply
                        postId={postId}
                        timeZone={timeZone}
                        replyTargetId={replyTargetId}
                        onToggleReply={toggleReply}
                        onSubmitSuccess={handleSubmitSuccess}
                      />
                    ))}
                  </ul>
                ) : null}
              </CommentItem>
            );
          })}
        </ul>
      )}

      {!loading && comments.length === 0 ? (
        <div className="comment-empty">
          <i className="fa-regular fa-comment-dots" aria-hidden="true" />
          <span>沙发还空着，来发表第一条评论吧</span>
        </div>
      ) : null}

      {hasMore ? (
        <div className="comment-load-more-wrap">
          <button
            type="button"
            className="btn comment-load-more"
            onClick={() => setVisibleFloors((prev) => prev + FLOOR_STEP)}
          >
            加载更多评论
          </button>
        </div>
      ) : null}

      <div className="ember-comment-form">
        <CommentForm postId={postId} onSuccess={handleSubmitSuccess} />
      </div>
    </section>
  );
}
