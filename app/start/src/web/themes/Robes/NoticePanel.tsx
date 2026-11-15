'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import {
  IconClose,
  IconHeadphone,
  IconHeart,
  IconMail,
  IconRefresh,
  IconSend,
  IconShuffle,
  IconSparkle,
  IconUser,
  IconWater,
} from './Icons';
import { parseNoticeBoard, plainText } from './utils';
import MoodPlayer, { type MoodSong } from './MoodPlayer';

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

type Tab = 'board' | 'mood' | 'vibe' | 'mine' | 'latest';

const TABS: { key: Tab; label: string }[] = [
  { key: 'board', label: '公告' },
  { key: 'mood', label: '心情' },
  { key: 'vibe', label: '漂流瓶' },
  { key: 'mine', label: '我的评论' },
  { key: 'latest', label: '最新评论' },
];

const BOTTLE_KEY = 'robes-bottles';
const COMMENT_KEY = 'comment_user';

interface Bottle {
  id: string;
  text: string;
  created: number;
}

/** 读取本机投递过的漂流瓶（原站存在服务端，Utterlog 侧先用浏览器本地存储）。 */
function readBottles(): Bottle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOTTLE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw);
    return Array.isArray(rows) ? (rows as Bottle[]) : [];
  } catch {
    return [];
  }
}

/** 读取本机评论时使用的昵称，用来筛出「我的评论」。 */
function readMyName(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(COMMENT_KEY);
    if (!raw) return '';
    const data = JSON.parse(raw);
    return String(data?.name || '').trim();
  } catch {
    return '';
  }
}

/**
 * 站点选项 robes_mood_song —— 站长显式指定的「此刻在听」歌单。
 * 可以是单个对象 {name,title,artist,cover,url}，也可以是这类对象的数组。
 */
function parseMoodOption(raw: string): MoodSong[] {
  const text = String(raw || '').trim();
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    const rows = Array.isArray(data) ? data : [data];
    const songs: MoodSong[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const item = row as Record<string, unknown>;
      const title = String(item.title || item.name || '').trim();
      const url = String(item.url || item.play_url || '').trim();
      if (!title || !url) continue;
      songs.push({
        title,
        artist: String(item.artist || '').trim(),
        cover: String(item.cover || item.cover_url || '').trim(),
        url,
      });
    }
    return songs;
  } catch {
    return [];
  }
}

/**
 * 站内音乐库（/api/v1/music，已发布歌曲）→ 心情卡播放列表。
 * 平台歌曲（网易云 / QQ 等）走站内代理取封面与音频流，本地文件直接用 uploads 地址。
 */
function toMoodSongs(rows: unknown): MoodSong[] {
  const list = Array.isArray(rows) ? rows : [];
  const songs: MoodSong[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const title = String(item.title || '').trim();
    if (!title) continue;
    const platform = String(item.platform || '').trim();
    const platformId = String(item.platform_id || '').trim();
    const proxy =
      platform && platformId && platform !== 'local'
        ? `/api/v1/music/proxy/${encodeURIComponent(platform)}/songs/${encodeURIComponent(platformId)}`
        : '';
    const url = String(item.play_url || '').trim() || (proxy ? `${proxy}/stream` : '');
    if (!url) continue;
    const cover = String(item.cover_url || '').trim() || (proxy ? `${proxy}/cover` : '');
    songs.push({
      id: item.id as number | undefined,
      title,
      artist: String(item.artist || '').trim(),
      cover,
      url,
    });
  }
  return songs;
}

/**
 * 顶栏信封面板：通知中心（公告 / 心情 / 漂流瓶 / 我的评论 / 最新评论）。
 *
 * 结构对齐原主题 notice.php 的 DOM 契约：
 * .notice-head(.notice-head-top + .notice-tabs) → .notice-board-view / .notice-mood /
 * .notice-vibe / .notice-list → .notice-foot。
 *
 * 数据来源的差异（原站依赖 Typecho 插件，Utterlog 侧没有对应表）：
 * - 公告：站点选项 robes_notice（每行「2026-11-05｜内容」）。
 * - 心情：站点选项 robes_mood，可选 robes_mood_status / robes_mood_song / robes_mood_date。
 * - 漂流瓶：浏览器本地存储（无服务端表）。
 * - 我的评论：按本机评论昵称（localStorage comment_user）过滤评论接口。
 */
export default function NoticePanel({ onClose }: { onClose: () => void }) {
  const { site, options, owner } = useThemeContext();
  const [tab, setTab] = useState<Tab>('board');
  const [comments, setComments] = useState<LatestComment[]>([]);
  const [perPage, setPerPage] = useState(8);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [myName, setMyName] = useState('');
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [picked, setPicked] = useState<Bottle | null>(null);
  const [draft, setDraft] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [librarySongs, setLibrarySongs] = useState<MoodSong[]>([]);

  const tabsRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [thumbReady, setThumbReady] = useState(false);

  const board = parseNoticeBoard(String(options?.robes_notice || ''));
  const mood = String(options?.robes_mood || '').trim() || site.description || owner.bio || '今天也在认真生活，慢慢来，别着急。';

  // 心情卡的歌曲：优先用站长指定的 robes_mood_song，否则取站内音乐库。
  const optionSongs = useMemo(
    () => parseMoodOption(String(options?.robes_mood_song || '')),
    [options?.robes_mood_song],
  );
  const playerSongs = optionSongs.length ? optionSongs : librarySongs;

  const statusText = String(options?.robes_mood_status || '').trim() || (playerSongs.length ? '听歌' : '记录生活');

  // 心情页才去读音乐库。
  useEffect(() => {
    if (tab !== 'mood') return;
    let alive = true;
    fetch('/api/v1/music?per_page=20', { headers: { accept: 'application/json' } })
      .then((response) => response.json())
      .then((payload) => {
        if (!alive) return;
        const rows = payload?.data?.items || payload?.data?.data || payload?.data || payload?.items || [];
        setLibrarySongs(toMoodSongs(rows));
      })
      .catch(() => {
        /* 读不到音乐库就只留站长配置的歌单 */
      });
    return () => {
      alive = false;
    };
  }, [tab]);

  /**
   * 拉评论。
   *
   * excludeAdmin = true 时走服务端的 exclude_admin：把博主（站长）自己发的评论
   * 和回复整条滤掉，「最新评论」里只留访客的留言 —— 站点自己顶帖没有意义。
   * 「我的评论」不传这个参数：博主用本站身份留言时，那条评论本来就该出现在自己名下。
   */
  const loadComments = useCallback(async (size: number, excludeAdmin: boolean) => {
    setLoading(true);
    setFailed(false);
    try {
      const query = `per_page=${size}&order=desc${excludeAdmin ? '&exclude_admin=1' : ''}`;
      const response = await fetch(`/api/v1/comments/?${query}`, {
        headers: { accept: 'application/json' },
      });
      const payload = await response.json();
      const rows = payload?.data?.items || payload?.data?.data || payload?.data || payload?.items || [];
      setComments(Array.isArray(rows) ? rows : []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 评论相关的两个 Tab 才去拉数据。
  useEffect(() => {
    if (tab !== 'latest' && tab !== 'mine') return;
    void loadComments(perPage, tab === 'latest');
  }, [tab, perPage, loadComments]);

  // 本机身份（评论昵称）与本机漂流瓶。
  useEffect(() => {
    setMyName(readMyName());
    setBottles(readBottles());
  }, []);

  // Tab 滑块：量出当前 Tab 的位置，让玻璃滑块跟着走（原站 .notice-tab-thumb）。
  useEffect(() => {
    const sync = () => {
      const wrap = tabsRef.current;
      const thumb = thumbRef.current;
      if (!wrap || !thumb) return;
      const active = wrap.querySelector<HTMLElement>('.notice-tab.is-active');
      if (!active) return;
      thumb.style.width = `${active.offsetWidth}px`;
      thumb.style.transform = `translateX(${Math.max(0, active.offsetLeft - 3)}px)`;
      setThumbReady(true);
    };
    sync();
    const wrap = tabsRef.current;
    const observer = typeof ResizeObserver !== 'undefined' && wrap ? new ResizeObserver(sync) : null;
    observer?.observe(wrap as Element);
    window.addEventListener('resize', sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [tab]);

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

  const myComments = useMemo(() => {
    if (!myName) return [];
    const key = myName.trim().toLowerCase();
    return comments.filter((comment) => String(comment.author || '').trim().toLowerCase() === key);
  }, [comments, myName]);

  const pickBottle = () => {
    setSpinning(true);
    window.setTimeout(() => {
      setSpinning(false);
      const pool = bottles.length ? bottles : [];
      if (!pool.length) {
        setPicked(null);
        return;
      }
      const next = pool[Math.floor(Math.random() * pool.length)];
      setPicked(next);
    }, 420);
  };

  const dropBottle = () => {
    const text = draft.trim();
    if (!text) return;
    const next: Bottle = { id: `${Date.now()}`, text, created: Date.now() };
    const stored = [next, ...bottles].slice(0, 50);
    setBottles(stored);
    setDraft('');
    try {
      localStorage.setItem(BOTTLE_KEY, JSON.stringify(stored));
    } catch {
      /* 隐私模式下写不进去，界面仍然显示 */
    }
  };

  return (
    <div
      className={tab === 'mood' || tab === 'vibe' ? 'notice-pop active is-tall' : 'notice-pop active'}
      role="dialog"
      aria-label="通知中心"
    >
      <div className="notice-head">
        <div className="notice-head-top">
          <span className="notice-head-title">
            <span className="notice-head-ico">
              <IconMail size={13} />
            </span>
            通知中心
            {comments.length ? <span className="notice-head-count">{comments.length}</span> : null}
          </span>
          <div className="notice-head-actions">
            <button
              type="button"
              className={spinning ? 'notice-refresh is-spinning' : 'notice-refresh'}
              onClick={() => {
                setSpinning(true);
                window.setTimeout(() => setSpinning(false), 600);
                void loadComments(perPage, tab === 'latest');
              }}
              title="刷新"
              aria-label="刷新"
            >
              <IconRefresh size={14} />
            </button>
            <button type="button" className="notice-close" onClick={onClose} title="收起" aria-label="收起">
              <IconClose size={14} />
            </button>
          </div>
        </div>

        <div className="notice-tabs" role="tablist" aria-label="通知分类" ref={tabsRef}>
          <span className={thumbReady ? 'notice-tab-thumb is-ready' : 'notice-tab-thumb'} aria-hidden="true" ref={thumbRef} />
          {TABS.map((item) => (
            <button
              type="button"
              key={item.key}
              role="tab"
              data-tab={item.key}
              aria-selected={tab === item.key}
              className={tab === item.key ? 'notice-tab is-active' : 'notice-tab'}
              onClick={() => setTab(item.key)}
            >
              <span className="notice-tab-label">{item.label}</span>
              {item.key === 'latest' && comments.length ? (
                <span className="notice-tab-count">{comments.length}</span>
              ) : null}
            </button>
          ))}
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
                    <span className="notice-board-date">{item.date}</span>
                    <p className="notice-board-text">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice-empty">
              <IconWater size={17} />
              <p>暂无站内公告</p>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'mood' ? (
        <div className="notice-mood">
          <div className="mood-card has-status">
            <span className="mood-ava-wrap">
              <span className="mood-ava">
                {owner.avatar ? <img src={owner.avatar} alt="" /> : null}
                {!owner.avatar ? <span>{String(owner.nickname || site.title || 'U').slice(0, 1)}</span> : null}
              </span>
              <span className="mood-online" title="在线" aria-label="在线" />
            </span>
            <div className="mood-card-body">
              <div className="mood-card-top">
                <span className="mood-owner">{owner.nickname || site.title}</span>
                <span className="mood-badge">站长</span>
                <span className="mood-card-date">{vibeDate}</span>
              </div>
              <span className="mood-status-pill">
                <span className="mood-status-emoji">
                  {playerSongs.length ? <IconHeadphone size={14} className="mood-ico" /> : <IconSparkle size={13} className="mood-ico" />}
                </span>
                <span className="mood-status-text">{statusText}</span>
              </span>
              <p className="mood-text">{mood}</p>
              {playerSongs.length ? <MoodPlayer songs={playerSongs} /> : null}
              <div className="mood-card-foot">
                <span className="mood-updated">
                  {String(options?.robes_mood_updated || '').trim() || `更新于 ${vibeDate}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'vibe' ? (
        <div className="notice-vibe">
          <div className="vibe-chat-head">
            <span className="vibe-hero-ico">
              <IconWater size={13} />
            </span>
            <span className="vibe-chat-txt">
              <span className="vibe-chat-title">漂流瓶</span>
              <span className="vibe-chat-sub">匿名信笺，捞起陌生人的心事</span>
            </span>
            <button type="button" className="vibe-pick" onClick={pickBottle}>
              <IconShuffle size={12} />
              捞一个
            </button>
          </div>
          <div className="vibe-bottle-body">
            {picked ? (
              <div className="vibe-note">
                <p className="vibe-note-text">{picked.text}</p>
                <div className="vibe-note-meta">
                  <IconHeart size={11} />
                  <span>漂流瓶</span>
                  <span className="vibe-meta-dot" />
                  <span>{new Date(picked.created).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ) : (
              <div className="vibe-bottle-empty">
                <span className="vibe-empty-ico">
                  <IconMail size={15} />
                </span>
                <strong>海里漂着陌生人的心事</strong>
                <span className="vibe-empty-desc">点「捞一个」，随机打捞一只漂流瓶</span>
              </div>
            )}
          </div>
          <form
            className="vibe-drop-form vibe-composer"
            onSubmit={(event) => {
              event.preventDefault();
              dropBottle();
            }}
          >
            <div className="vibe-composer-bar">
              <textarea
                id="vibeText"
                maxLength={120}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="写点什么，让它漂向远方…"
              />
              <span className="vibe-drop-count">{draft.length}/120</span>
              <button type="submit" className="vibe-send" title="扔进海里" aria-label="扔进海里" disabled={!draft.trim()}>
                <IconSend size={12} />
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {tab === 'mine' ? (
        <div className="notice-list">
          {loading ? (
            <div className="notice-skeleton">
              <span />
              <span />
            </div>
          ) : !myName ? (
            <div className="notice-empty">
              <IconUser size={17} />
              <p>还没有识别到本机昵称</p>
              <span className="notice-empty-desc">用同一个昵称留言后，这里会列出你的评论</span>
            </div>
          ) : myComments.length ? (
            myComments.map((comment) => (
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
              <p>还没有找到你的评论</p>
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

      {tab === 'latest' && comments.length >= perPage ? (
        <div className="notice-foot">
          <button type="button" className="notice-more" onClick={() => setPerPage((value) => value + 8)}>
            加载更多
          </button>
        </div>
      ) : null}

      {tab === 'vibe' ? (
        <div className="notice-foot">
          <span className="notice-foot-tip">
            <Link href="/guestbook">去留言板说点什么</Link>
          </span>
        </div>
      ) : null}
    </div>
  );
}
