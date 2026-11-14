'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { IconHeart, IconRefresh, IconSailboat, IconWater } from './Icons';
import { parseNoticeBoard, plainText } from './utils';

interface LatestComment {
  id: number;
  author?: string;
  content?: string;
  created_at?: string | number;
  post_id?: number;
  post_title?: string;
  post_slug?: string;
  avatar_url?: string;
}

type Tab = 'board' | 'latest' | 'vibe';

/**
 * 顶栏铃铛面板：公告 / 最新评论 / 小站。
 *
 * 原主题的「我的评论」依赖 Typecho 的访客指纹接口，Utterlog 侧没有对应数据源，
 * 这里换成公开的「最新评论」；「小站」保留站长心情，漂流瓶需要服务端存储，
 * Utterlog 目前没有对应表，故不实现。
 */
export default function NoticePanel({ onClose }: { onClose: () => void }) {
  const { site, options, owner } = useThemeContext();
  const [tab, setTab] = useState<Tab>('board');
  const [comments, setComments] = useState<LatestComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const board = parseNoticeBoard(String(options?.robes_notice || ''));
  const mood = String(options?.robes_mood || '').trim() || site.description || owner.bio || '今天也在认真生活，慢慢来，别着急。';

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch('/api/v1/comments/?per_page=8&order=desc', { headers: { accept: 'application/json' } });
      const payload = await response.json();
      const rows = payload?.data?.items || payload?.data?.data || payload?.data || payload?.items || [];
      setComments(Array.isArray(rows) ? rows : []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'latest' && !comments.length && !loading) void loadLatest();
  }, [tab, comments.length, loading, loadLatest]);

  // 点面板外关闭。
  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.notice-pop') || target.closest('.notice-btn')) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('click', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const today = new Date();
  const week = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];
  const vibeDate = `${today.getMonth() + 1}月${today.getDate()}日 · 周${week}`;

  return (
    <div className="notice-pop active" role="dialog" aria-label="通知与公告">
      <div className="notice-head">
        <div className="notice-tabs">
          <button
            type="button"
            className={tab === 'board' ? 'notice-tab is-active' : 'notice-tab'}
            onClick={() => setTab('board')}
          >
            公告
          </button>
          <button
            type="button"
            className={tab === 'latest' ? 'notice-tab is-active' : 'notice-tab'}
            onClick={() => setTab('latest')}
          >
            最新评论
            {comments.length ? <span className="notice-tab-count">{comments.length}</span> : null}
          </button>
          <button
            type="button"
            className={tab === 'vibe' ? 'notice-tab is-active' : 'notice-tab'}
            onClick={() => setTab('vibe')}
          >
            小站
          </button>
        </div>
        <div className="notice-head-actions">
          <button type="button" className="notice-refresh" onClick={loadLatest} title="刷新最新评论" aria-label="刷新最新评论">
            <IconRefresh size={15} />
          </button>
        </div>
      </div>

      {tab === 'board' ? (
        <div className="notice-board-view">
          {board.length ? (
            <div className="notice-board-list">
              {board.map((item, index) => (
                <div className="notice-board-item" key={`${item.date}-${index}`}>
                  <span className="notice-board-bullet" />
                  <div className="notice-board-main">
                    <p className="notice-board-text">{item.text}</p>
                    {item.date ? <span className="notice-board-date">{item.date}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice-empty">
              <IconWater size={16} />
              <p>暂无站内公告</p>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'latest' ? (
        <div className="notice-list">
          {loading ? (
            <div className="notice-skeleton">
              <span />
              <span />
              <span />
            </div>
          ) : failed ? (
            <div className="notice-empty">
              <p>加载失败，请稍后重试</p>
            </div>
          ) : comments.length ? (
            comments.map((comment) => (
              <PostLink
                className="notice-item"
                key={comment.id}
                post={{ id: comment.post_id, slug: comment.post_slug }}
              >
                <span className="notice-avatar">
                  {comment.avatar_url ? (
                    <img src={comment.avatar_url} alt="" loading="lazy" />
                  ) : (
                    <span className="notice-avatar-text">{String(comment.author || '?').slice(0, 1)}</span>
                  )}
                </span>
                <span className="notice-main">
                  <span className="notice-row1">
                    <span className="notice-name">{comment.author || '匿名'}</span>
                    <span className="notice-time">{String(comment.post_title || '').slice(0, 12)}</span>
                  </span>
                  <span className="notice-text">{plainText(comment.content, 80)}</span>
                </span>
              </PostLink>
            ))
          ) : (
            <div className="notice-empty">
              <p>还没有评论，来说两句吧</p>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'vibe' ? (
        <div className="notice-vibe">
          <div className="vibe-hero">
            <span className="vibe-hero-quote" aria-hidden="true">
              &ldquo;
            </span>
            <div className="vibe-hero-top">
              <span className="vibe-hero-tag">
                <IconHeart size={12} />
                站长心情
                <span className="vibe-hero-dot" aria-hidden="true" />
              </span>
              <span className="vibe-hero-date">{vibeDate}</span>
            </div>
            <p className="vibe-hero-text">{mood}</p>
          </div>

          <div className="vibe-sec">
            <div className="vibe-sec-head">
              <span className="vibe-sec-title">
                <IconSailboat size={13} />
                关于本站
              </span>
              <span className="vibe-drop-count">{site.subtitle || 'Utterlog'}</span>
            </div>
            <div className="vibe-bottle-body">
              <div className="vibe-bottle-empty">
                <IconWater size={14} />
                <span>{site.description || owner.bio || '一个安静写字的地方'}</span>
              </div>
            </div>
          </div>

          <div className="vibe-sec">
            <div className="vibe-sec-head">
              <span className="vibe-sec-title">快速入口</span>
            </div>
            <div className="vibe-bottle-body">
              <div className="vibe-bottle-empty">
                <Link href="/archives">归档</Link>
                <span className="dot" />
                <Link href="/categories">分类</Link>
                <span className="dot" />
                <Link href="/tags">标签</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
