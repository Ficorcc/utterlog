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
  (emojiPack as any).emojis.map((e: EmojiEntry) => [e.slug, e] as [string, EmojiEntry]),
);

/** 主楼一批展示多少条，剩下的交给「加载更多评论」按钮 */
const FLOOR_STEP = 10;

interface CommentGeo {
  country_code?: string;
  country?: string;
  province?: string;
  city?: string;
}

interface GlazeComment {
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
  status?: string;
  created_at: number;
  children?: GlazeComment[];
}

/* ---------- 正文渲染：表情 + 裸链（外链统一经 /go 确认页跳转） ---------- */

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
    last = match.index + match[0].length;
  }
  if (last < content.length) nodes.push(...linkify(content.slice(last), 'post'));
  return nodes;
}

/* ---------- 树形结构与工具函数 ---------- */

function buildTree(comments: GlazeComment[]): GlazeComment[] {
  const map = new Map<number, GlazeComment>();
  const roots: GlazeComment[] = [];
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
function flattenReplies(node: GlazeComment): { comment: GlazeComment; parent: GlazeComment }[] {
  const result: { comment: GlazeComment; parent: GlazeComment }[] = [];
  const walk = (current: GlazeComment, parent: GlazeComment) => {
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
function participantKey(comment: GlazeComment): string {
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
  parentId,
  isReply,
  floor,
  postId,
  timeZone,
  replyTargetId,
  onToggleReply,
  onSubmitSuccess,
  children,
}: {
  comment: GlazeComment;
  parentAuthor?: string;
  parentId?: number;
  isReply?: boolean;
  floor?: number;
  postId: number;
  timeZone: string;
  replyTargetId: number | null;
  onToggleReply: (comment: GlazeComment) => void;
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
      id={`comment-${comment.id}`}
      className={`comment-thread${isReply ? ' comment-reply' : ''}${comment.is_admin ? ' bypostauthor' : ''}`}
    >
      <article id={`div-comment-${comment.id}`} className="comment-body">
        <header className="comment-meta">
          <div className="comment-meta-details" role="group" aria-label="评论信息">
            <span className={`comment-avatar ${isReply ? 'comment-avatar-inline' : 'comment-avatar-compact'}`}>
              <span className="comment-avatar-photo" aria-hidden="true">
                <CommentAvatar
                  name={comment.author}
                  candidates={comment.avatar_candidates}
                  src={comment.avatar_url}
                  size={isReply ? 20 : 32}
                  alt={comment.author}
                />
              </span>
              {comment.is_admin ? (
                <span className="comment-avatar-badge comment-admin-badge" role="img" aria-label="管理员" />
              ) : null}
            </span>
            <div className="comment-author vcard" title={comment.author}>
              {comment.author}
            </div>
            {location ? (
              <span className="comment-location" tabIndex={0} aria-label={location}>
                <span className="comment-location-name">{location}</span>
              </span>
            ) : null}
          </div>

          {!isReply && typeof floor === 'number' ? (
            <span className="comment-floor" title={`第 ${floor} 楼`}>
              <span className="comment-floor-watermark" aria-hidden="true">#</span>
              {floor}
            </span>
          ) : null}

          <div className="comment-meta-actions">
            <a className="comment-metadata" href={`#comment-${comment.id}`} title={fullTime} aria-label={fullTime}>
              <time dateTime={new Date(comment.created_at * 1000).toISOString()}>{relativeTime(comment.created_at)}</time>
            </a>
            <span className="comment-reply-action">
              <button
                type="button"
                className="comment-reply-link squircle"
                aria-label={`回复 ${comment.author}`}
                title={`回复 ${comment.author}`}
                onClick={() => onToggleReply(comment)}
              >
                <i className="fa-regular fa-comment" aria-hidden="true" />
              </button>
            </span>
          </div>
        </header>

        {comment.status === 'pending' ? <em className="comment-awaiting-moderation">待审核</em> : null}

        <div className="comment-content">
          {isReply && parentAuthor ? (
            <>
              <a className="comment-reply-mention" href={`#comment-${parentId || comment.parent_id || 0}`}>
                @{parentAuthor}
              </a>{' '}
            </>
          ) : null}
          {renderContent(comment.content || '')}
        </div>

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
      </article>
      {children}
    </li>
  );
}

/* ---------- 评论区 ---------- */

/**
 * 评论区。
 *
 * 上游结构（comments.php + template-parts/comment-list.php + comment-row.php）：
 *   section#comments.comments-area.glaze-panel
 *     ├─ header.comments-summary（标题 + 写评论入口）
 *     ├─ div[data-glaze-comment-list] > ol.comment-list > li.comment-thread
 *     └─ 表单区（复用共享评论表单，样式由 parts/comments.css 适配）
 */
export default function CommentSection({ postId, title }: { postId: number; title?: string }) {
  const { options, timeZone } = useThemeContext();
  const [comments, setComments] = useState<GlazeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleFloors, setVisibleFloors] = useState(FLOOR_STEP);
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const requestVersion = useRef(0);

  const fetchComments = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const data = await loadApprovedComments<GlazeComment>(postId, 'asc');
      if (version !== requestVersion.current) return;
      setComments(data);
    } catch {
      if (version === requestVersion.current) setComments([]);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    setVisibleFloors(FLOOR_STEP);
    fetchComments();
  }, [fetchComments]);

  const tree = useMemo(() => buildTree(comments), [comments]);
  const floors = useMemo(() => tree.slice(0, visibleFloors), [tree, visibleFloors]);
  const hasMore = tree.length > floors.length;

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

  const toggleReply = useCallback((comment: GlazeComment) => {
    setReplyTargetId((prev) => (prev === comment.id ? null : comment.id));
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    setReplyTargetId(null);
    fetchComments();
  }, [fetchComments]);

  return (
    <section id="comments" className="comments-area glaze-panel" aria-labelledby="comments-title">
      <header className="comments-summary">
        <h2 id="comments-title" className="comments-title">
          <svg className="comments-title-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.5-.7L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" />
          </svg>
          <span>
            共 {comments.length} 条评论{participants ? ` · ${participants} 人参与` : ''}
          </span>
        </h2>
        <a className="comments-write-link" href="#respond">写评论</a>
      </header>

      <div data-glaze-comment-list>
        {loading ? (
          <div className="comment-loading">评论加载中…</div>
        ) : (
          <ol className="comment-list">
            {floors.map((comment, index) => {
              const replies = flattenReplies(comment);
              return (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  floor={index + 1}
                  postId={postId}
                  timeZone={timeZone}
                  replyTargetId={replyTargetId}
                  onToggleReply={toggleReply}
                  onSubmitSuccess={handleSubmitSuccess}
                >
                  {replies.length ? (
                    <ul className="children">
                      {replies.map(({ comment: reply, parent }) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          parentAuthor={parent.author}
                          parentId={parent.id}
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
          </ol>
        )}

        {!loading && comments.length === 0 ? (
          <p className="comment-empty">还没有评论，来留下第一条吧。</p>
        ) : null}
      </div>

      {hasMore ? (
        <div className="comment-load-more-wrap">
          <button type="button" className="control-button comment-load-more" onClick={() => setVisibleFloors((prev) => prev + FLOOR_STEP)}>
            加载更多评论
          </button>
        </div>
      ) : null}

      <div id="respond" className="glaze-comment-form">
        <div className="glaze-comment-heading">
          <h3 id="reply-title" className="comment-reply-title">
            <span className="glaze-comment-title-icon glaze-icon" data-glaze-icon="talks" aria-hidden="true" />
            {title ? `评论「${title}」` : '发表评论'}
          </h3>
          <p className="glaze-comment-guidance">请遵守社区规范，友善交流。支持表情与 Markdown 语法。</p>
        </div>
        <CommentForm postId={postId} onSuccess={handleSubmitSuccess} />
        {options?.allow_comments === 'false' ? <p className="glaze-comment-error">本站已关闭评论。</p> : null}
      </div>
    </section>
  );
}
