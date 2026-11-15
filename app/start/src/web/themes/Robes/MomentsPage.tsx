'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { momentsApi, mediaApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useThemeContext } from '@/lib/theme-context';
import { datePartsInTimeZone } from '@/lib/timezone';
import ResilientImage from '@/components/blog/ResilientImage';
import Lightbox from '@/components/blog/Lightbox';
import { MomentCommentRow, MomentReplyCard } from '@/components/pages/moments/MomentComments';
import { IconChat, IconClose, IconHeart, IconImage, IconSend, IconSparkle } from './Icons';

/**
 * Robes 主题的「说说」页。
 *
 * 应用层默认页是散落式瀑布（绝对定位 + 固定 250px 卡片 + 文字截断），
 * 在 Robes 的窄正文列里会溢出裁切、长文被折叠。这里改成主题自己的
 * 玻璃卡片流式布局：
 *   - 一次取全量说说（per_page=500），条目全部列出，不做分页折叠；
 *   - 正文完整显示（不截断），配图全部展示；
 *   - 保留原能力：点赞、评论（展开 + 写评论 / 回复）、标签与时间筛选、
 *     管理员发布（文字 / 标签 / 位置 / 图片）。
 */

interface MomentItem {
  id: number;
  content: string;
  images: string[] | string;
  location?: string;
  mood?: string;
  source?: string;
  created_at: number;
  like_count?: number;
  comment_count?: number;
  liked?: boolean;
}

const PER_PAGE = 500;

function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim());
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string' && item.trim());
    } catch {
      /* 落到下面的解析 */
    }
  }
  if (text.startsWith('{') && text.endsWith('}')) {
    return text
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }
  return text.split(',').map((item) => item.trim()).filter((item) => item.startsWith('http'));
}

function relativeTime(ts: number) {
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

function formatSource(source?: string) {
  const raw = String(source || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  if (raw === '网页' || ['local', 'web', 'browser'].includes(normalized)) return '网页';
  if (normalized === 'telegram') return 'Telegram';
  return raw;
}

export default function MomentsPage({
  initialMoments = [],
}: {
  initialMoments?: any[];
}) {
  const { timeZone, owner } = useThemeContext();
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const [moments, setMoments] = useState<MomentItem[]>(initialMoments || []);
  const [loading, setLoading] = useState(!initialMoments?.length);
  const [filterTag, setFilterTag] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // 发布器
  const [showComposer, setShowComposer] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 点赞
  const [likingIds, setLikingIds] = useState<number[]>([]);

  // 评论
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [commentsCache, setCommentsCache] = useState<Record<number, any[]>>({});
  const [commentLoadingIds, setCommentLoadingIds] = useState<number[]>([]);
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [commentForm, setCommentForm] = useState({ author_name: '', author_email: '', author_url: '', content: '' });
  const [commentError, setCommentError] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // 灯箱
  const [lightbox, setLightbox] = useState<{
    list: { src: string; alt: string }[];
    index: number;
    originRect: DOMRect | null;
  } | null>(null);

  const fetchMoments = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    try {
      const response: any = await momentsApi.list({ per_page: PER_PAGE });
      const rows = response?.data?.data || response?.data || [];
      setMoments(Array.isArray(rows) ? rows : []);
    } catch {
      toast.error('说说加载失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMoments(Boolean(initialMoments?.length));
  }, [fetchMoments, initialMoments]);

  // 标签 / 时间维度（从全量数据里现算）
  const tagStats = useMemo(() => {
    const map = new Map<string, number>();
    moments.forEach((moment) => {
      const tag = String(moment.mood || '').trim();
      if (tag) map.set(tag, (map.get(tag) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [moments]);

  const monthStats = useMemo(() => {
    const map = new Map<string, number>();
    moments.forEach((moment) => {
      const parts = datePartsInTimeZone(moment.created_at, timeZone);
      if (!parts.year || !parts.month) return;
      const key = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [moments, timeZone]);

  const filtered = useMemo(() => {
    return moments.filter((moment) => {
      if (filterTag && String(moment.mood || '').trim() !== filterTag) return false;
      if (filterMonth) {
        const parts = datePartsInTimeZone(moment.created_at, timeZone);
        if (`${parts.year}-${String(parts.month).padStart(2, '0')}` !== filterMonth) return false;
      }
      return true;
    });
  }, [moments, filterTag, filterMonth, timeZone]);

  const loadComments = useCallback(async (momentId: number) => {
    if (commentLoadingIds.includes(momentId)) return;
    setCommentLoadingIds((ids) => [...ids, momentId]);
    try {
      const response: any = await momentsApi.comments(momentId);
      setCommentsCache((cache) => ({ ...cache, [momentId]: response?.data || [] }));
    } catch {
      toast.error('评论加载失败');
    } finally {
      setCommentLoadingIds((ids) => ids.filter((item) => item !== momentId));
    }
  }, [commentLoadingIds]);

  const toggleComments = (momentId: number) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(momentId)) {
        next.delete(momentId);
      } else {
        next.add(momentId);
        if (!commentsCache[momentId]) void loadComments(momentId);
      }
      return next;
    });
  };

  const handleLike = async (moment: MomentItem) => {
    const id = Number(moment.id);
    if (!Number.isInteger(id) || likingIds.includes(id)) return;
    setLikingIds((ids) => [...ids, id]);
    try {
      const response: any = await momentsApi.toggleLike(id);
      const result = response?.data || response;
      setMoments((prev) => prev.map((item) => (Number(item.id) === id
        ? { ...item, liked: Boolean(result.liked), like_count: Number(result.like_count || 0) }
        : item)));
    } catch {
      toast.error('点赞失败，请稍后再试');
    } finally {
      setLikingIds((ids) => ids.filter((item) => item !== id));
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const response: any = await mediaApi.upload(file, 'moments');
        const url = response?.data?.url || response?.url;
        if (url) setImages((prev) => [...prev, url]);
      }
    } catch {
      toast.error('图片上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    if (!content.trim() && !images.length) {
      toast.error('写点内容再发布吧');
      return;
    }
    setSubmitting(true);
    try {
      let finalContent = content.trim();
      let finalMood = mood.trim();
      const hashMatch = finalContent.match(/#([\u4e00-\u9fffa-zA-Z0-9_]+)/);
      if (hashMatch) {
        finalMood = hashMatch[1];
        finalContent = finalContent.replace(hashMatch[0], '').trim();
      }
      await momentsApi.create({
        content: finalContent,
        mood: finalMood,
        location: location.trim(),
        source: '网页',
        images,
        visibility: 'public',
      });
      toast.success('发布成功');
      setContent('');
      setMood('');
      setLocation('');
      setImages([]);
      setShowComposer(false);
      void fetchMoments(true);
    } catch {
      toast.error('发布失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async (momentId: number) => {
    if (commentSubmitting) return;
    if (!commentForm.author_name.trim()) {
      setCommentError('昵称不能为空');
      return;
    }
    if (!commentForm.content.trim()) {
      setCommentError('评论内容不能为空');
      return;
    }
    setCommentSubmitting(true);
    setCommentError('');
    try {
      const mention = replyTarget ? `@${String(replyTarget.author_name || '').trim()} ` : '';
      await momentsApi.addComment(momentId, {
        ...commentForm,
        content: `${mention}${commentForm.content.trim()}`,
      });
      try {
        localStorage.setItem('moment_commenter', JSON.stringify({
          n: commentForm.author_name.trim(),
          e: commentForm.author_email.trim(),
          u: commentForm.author_url.trim(),
        }));
      } catch {
        /* 隐私模式写不进去也不影响评论 */
      }
      toast.success(replyTarget ? '回复成功' : '评论成功');
      setReplyTarget(null);
      setCommentForm((form) => ({ ...form, content: '' }));
      setCommentsCache((cache) => ({ ...cache, [momentId]: [] }));
      void loadComments(momentId);
      setMoments((prev) => prev.map((item) => (Number(item.id) === momentId
        ? { ...item, comment_count: Number(item.comment_count || 0) + 1 }
        : item)));
    } catch (error: any) {
      setCommentError(error?.response?.data?.error?.message || '评论失败，请稍后再试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const openLightbox = (list: string[], index: number, originRect: DOMRect | null) => {
    if (document.documentElement.dataset.imgLightbox === '0') return;
    setLightbox({ list: list.map((src) => ({ src, alt: '' })), index, originRect });
  };

  const authorName = owner.nickname || '我';

  return (
    <div className="rb-moments">
      <div className="rb-mom-head">
        <div className="rb-mom-head-main">
          <span className="rb-mom-head-ico">
            <IconChat size={15} />
          </span>
          <h1 className="rb-mom-title">说说</h1>
          <span className="rb-mom-count">{filtered.length} 条</span>
        </div>
        {isAdmin ? (
          <button
            type="button"
            className={showComposer ? 'rb-mom-write is-active' : 'rb-mom-write'}
            onClick={() => setShowComposer((value) => !value)}
          >
            <IconSparkle size={13} />
            {showComposer ? '收起' : '写说说'}
          </button>
        ) : null}
      </div>

      {showComposer && isAdmin ? (
        <div className="rb-mom-composer">
          <textarea
            className="rb-mom-textarea"
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="此刻在想什么？支持 #标签"
          />
          {images.length ? (
            <div className="rb-mom-previews">
              {images.map((url, index) => (
                <button
                  type="button"
                  key={`${url}-${index}`}
                  className="rb-mom-preview"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  title="移除图片"
                  aria-label="移除图片"
                >
                  <img src={url} alt="" />
                  <span className="rb-mom-preview-x"><IconClose size={10} /></span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="rb-mom-composer-row">
            <input
              className="rb-mom-input"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              placeholder="标签（如 技术）"
              maxLength={20}
            />
            <input
              className="rb-mom-input"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="位置（可选）"
              maxLength={50}
            />
            <label className="rb-mom-file">
              <IconImage size={13} />
              {uploading ? '上传中…' : '图片'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageUpload}
              />
            </label>
            <button type="button" className="rb-mom-submit" onClick={handlePublish} disabled={submitting}>
              <IconSend size={12} />
              {submitting ? '发布中…' : '发布'}
            </button>
          </div>
        </div>
      ) : null}

      {(tagStats.length > 1 || monthStats.length > 1) ? (
        <div className="rb-mom-filters">
          <div className="rb-mom-chips">
            <button
              type="button"
              className={filterTag ? 'rb-mom-chip' : 'rb-mom-chip is-active'}
              onClick={() => setFilterTag('')}
            >
              全部标签
            </button>
            {tagStats.map(([tag, count]) => (
              <button
                type="button"
                key={tag}
                className={filterTag === tag ? 'rb-mom-chip is-active' : 'rb-mom-chip'}
                onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              >
                {tag}
                <span className="rb-mom-chip-n">{count}</span>
              </button>
            ))}
          </div>
          <select
            className="rb-mom-select"
            value={filterMonth}
            onChange={(event) => setFilterMonth(event.target.value)}
            aria-label="按月份筛选"
          >
            <option value="">全部时间</option>
            {monthStats.map(([key, count]) => (
              <option key={key} value={key}>{key.replace('-', ' 年 ')} 月（{count}）</option>
            ))}
          </select>
        </div>
      ) : null}

      {loading ? (
        <div className="rb-mom-empty">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="rb-mom-empty">
          <IconSparkle size={17} />
          <p>{moments.length ? '这个筛选下还没有说说' : '还没有说说'}</p>
        </div>
      ) : (
        <div className="rb-mom-list">
          {filtered.map((moment) => {
            const imgs = parseImages(moment.images);
            const id = Number(moment.id);
            const open = openComments.has(id);
            const sourceLabel = formatSource(moment.source);
            const parts = datePartsInTimeZone(moment.created_at, timeZone);
            const dateText = parts.year
              ? `${parts.year}年${parts.month}月${parts.day}日`
              : relativeTime(moment.created_at);
            return (
              <article className="rb-mom-card" key={moment.id}>
                <div className="rb-mom-card-top">
                  <span className="rb-mom-avatar">{String(authorName).slice(0, 1)}</span>
                  <span className="rb-mom-time" title={dateText}>{relativeTime(moment.created_at) || dateText}</span>
                  {moment.mood ? <span className="rb-mom-tag">{moment.mood}</span> : null}
                  {moment.location ? <span className="rb-mom-loc">{moment.location}</span> : null}
                  {sourceLabel ? <span className="rb-mom-src">via {sourceLabel}</span> : null}
                </div>

                {moment.content ? <div className="rb-mom-text">{moment.content}</div> : null}

                {imgs.length ? (
                  <div className={`rb-mom-media rb-mom-media-${Math.min(imgs.length, 4)}`}>
                    {imgs.map((url, index) => (
                      <button
                        type="button"
                        key={`${url}-${index}`}
                        className="rb-mom-media-cell"
                        onClick={(event) => openLightbox(imgs, index, event.currentTarget.getBoundingClientRect())}
                        aria-label={`查看第 ${index + 1} 张图片`}
                      >
                        <ResilientImage src={url} alt="" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="rb-mom-actions">
                  <button
                    type="button"
                    className={moment.liked ? 'rb-mom-act is-liked' : 'rb-mom-act'}
                    onClick={() => handleLike(moment)}
                    disabled={likingIds.includes(id)}
                    aria-pressed={Boolean(moment.liked)}
                  >
                    <IconHeart size={13} />
                    <span>{Number(moment.like_count || 0)}</span>
                  </button>
                  <button
                    type="button"
                    className={open ? 'rb-mom-act is-open' : 'rb-mom-act'}
                    onClick={() => toggleComments(id)}
                    aria-expanded={open}
                  >
                    <IconChat size={13} />
                    <span>{Number(moment.comment_count || 0)}</span>
                  </button>
                </div>

                {open ? (
                  <div className="rb-mom-comments">
                    {commentLoadingIds.includes(id) ? (
                      <p className="rb-mom-hint">评论加载中…</p>
                    ) : (commentsCache[id] || []).length === 0 ? (
                      <p className="rb-mom-hint">还没有评论，来说两句吧</p>
                    ) : (
                      <div className="rb-mom-comment-list">
                        {(commentsCache[id] || []).map((comment: any) => (
                          <MomentCommentRow
                            key={comment.id}
                            comment={comment}
                            timeText={relativeTime(Number(comment.created_at))}
                            onReply={(target) => setReplyTarget(target)}
                          />
                        ))}
                      </div>
                    )}

                    {replyTarget ? (
                      <MomentReplyCard target={replyTarget} onCancel={() => setReplyTarget(null)} />
                    ) : null}

                    <div className="rb-mom-form">
                      <div className="rb-mom-form-row">
                        <input
                          className="rb-mom-input"
                          value={commentForm.author_name}
                          onChange={(event) => setCommentForm((form) => ({ ...form, author_name: event.target.value }))}
                          placeholder="昵称 *"
                          maxLength={40}
                        />
                        <input
                          className="rb-mom-input"
                          value={commentForm.author_email}
                          onChange={(event) => setCommentForm((form) => ({ ...form, author_email: event.target.value }))}
                          placeholder="邮箱"
                          maxLength={80}
                        />
                        <input
                          className="rb-mom-input"
                          value={commentForm.author_url}
                          onChange={(event) => setCommentForm((form) => ({ ...form, author_url: event.target.value }))}
                          placeholder="网址"
                          maxLength={120}
                        />
                      </div>
                      <textarea
                        className="rb-mom-textarea rb-mom-textarea-sm"
                        rows={2}
                        value={commentForm.content}
                        onChange={(event) => setCommentForm((form) => ({ ...form, content: event.target.value }))}
                        placeholder={replyTarget ? `回复 @${replyTarget.author_name}` : '说点什么…'}
                        maxLength={500}
                      />
                      {commentError ? <p className="rb-mom-error">{commentError}</p> : null}
                      <div className="rb-mom-form-foot">
                        <button
                          type="button"
                          className="rb-mom-submit"
                          onClick={() => submitComment(id)}
                          disabled={commentSubmitting}
                        >
                          <IconSend size={12} />
                          {commentSubmitting ? '发送中…' : replyTarget ? '回复' : '发表评论'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {lightbox ? (
        <Lightbox
          list={lightbox.list}
          index={lightbox.index}
          originRect={lightbox.originRect}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
