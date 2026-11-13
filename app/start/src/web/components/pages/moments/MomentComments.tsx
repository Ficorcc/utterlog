'use client';

import type { ReactNode } from 'react';
import CommentAvatar from '@/components/CommentAvatar';

/**
 * 说说评论的前台展示件。
 *
 * 与文章评论区（components/blog/CommentList.tsx）保持同一套约定：
 * - 访客填了网站 → 昵称点击走 /go 确认页跳转，不直接甩外链；
 * - 点评论正文或「回复」按钮 → 打开回复框（轻量 @提及，不改表结构）。
 */

// 访客填了网站 → 昵称点击走 /go 确认页（与文章评论区一致）
export function authorHref(url?: string) {
  const u = String(url || '').trim();
  return u ? `/go?url=${encodeURIComponent(u)}` : '';
}

// 回复是轻量 @提及：内容开头的 @昵称 单独着色
export function renderMentionText(content: string): ReactNode {
  const m = /^(@[^\s@]{1,30})(?=\s|$)/.exec(content);
  if (!m) return content;
  return (
    <>
      <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{m[1]}</span>
      {content.slice(m[1].length)}
    </>
  );
}

export interface MomentComment {
  id: number;
  author_name: string;
  author_url?: string;
  content: string;
  is_admin?: boolean;
  created_at: number | string;
  /** 后端算好的头像候选链（Utterlog 自带 → … → Gravatar） */
  avatar_candidates?: string[];
}

/** 单条评论：头像（多平台回退）+ 昵称（带链接时走 /go）+ 时间 + 点正文即回复。 */
export function MomentCommentRow({ comment, timeText, onReply }: {
  comment: MomentComment;
  timeText: string;
  onReply: (comment: MomentComment) => void;
}) {
  const name = String(comment.author_name || '?');
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <CommentAvatar name={name} candidates={comment.avatar_candidates} size={26} alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          {comment.author_url ? (
            <a
              href={authorHref(comment.author_url)}
              rel="noopener noreferrer"
              title={String(comment.author_url)}
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
            >{name}</a>
          ) : (
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--community-text, #2b2a28)' }}>{name}</span>
          )}
          {comment.is_admin && (
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'var(--color-primary)', color: 'var(--color-primary-text, #fff)', letterSpacing: '0.04em' }}>博主</span>
          )}
          <span style={{ fontSize: '10px', color: 'var(--community-muted, #b8b4ad)' }}>{timeText}</span>
        </div>
        {/* 点评论正文即回复（不再另设「回复」按钮） */}
        <p
          onClick={() => onReply(comment)}
          title="点击回复"
          style={{ margin: '2px 0 0', fontSize: '12.5px', lineHeight: 1.7, color: 'var(--community-text, #3a3936)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'pointer' }}
        >{renderMentionText(String(comment.content || ''))}</p>
      </div>
    </div>
  );
}

/** 回复框顶部的引用块：被回复的昵称同样可点（填了网站的走 /go 确认页）。 */
export function MomentReplyCard({ target, onCancel }: {
  target: { author_name: string; author_url?: string; content: string };
  onCancel: () => void;
}) {
  return (
    <div style={{ marginBottom: '12px', padding: '9px 11px', borderRadius: '10px', background: 'var(--community-soft, #faf9f6)', border: '1px solid var(--community-border, #e8e4dd)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <i className="fa-solid fa-reply" aria-hidden="true" style={{ fontSize: '10px', color: 'var(--community-muted, #9e9a93)' }} />
        <span style={{ fontSize: '11px', color: 'var(--community-muted, #7a7670)' }}>回复</span>
        {target.author_url ? (
          <a
            href={authorHref(target.author_url)}
            rel="noopener noreferrer"
            title={target.author_url}
            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
          >{target.author_name}</a>
        ) : (
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--community-text, #2b2a28)' }}>{target.author_name}</span>
        )}
        <button
          type="button"
          onClick={onCancel}
          aria-label="取消回复"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--community-muted, #9e9a93)', fontSize: '13px', padding: '0 4px' }}
        >
          <i className="fa-regular fa-xmark" aria-hidden="true" />
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'var(--community-muted, #7a7670)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {target.content}
      </p>
    </div>
  );
}
