'use client';

import { useEffect, useRef, useState } from 'react';
import { IconArrowRight, IconLink } from './Icons';
import { plainText } from './utils';

/**
 * 朋友圈页：复刻原主题 friends.php 的结构。
 *
 * 原版（Typecho）这一页把每条友链当成一个好友，抓它自己的 RSS，
 * 每人取最新 3 篇文章，卡片按「该好友最新一篇的时间」倒序排列：
 *
 *   .friends-feed          → 好友卡片网格
 *     .friend-feed-card    → 一个好友
 *       .friend-feed-header
 *         .friend-feed-avatar → 头像（img 或首字）
 *         .friend-feed-info   → .friend-feed-name + .friend-feed-desc
 *         .friend-feed-visit  → 圆形跳转按钮
 *       .friend-feed-posts
 *         .friend-feed-item   → 一篇动态
 *           .friend-feed-item-head → .friend-feed-item-title + .friend-feed-item-date
 *           .friend-feed-item-desc
 *       .friend-feed-no-posts → 没有动态时的占位
 *     .friends-empty        → 一个好友都没有时的空态
 *
 * Utterlog 已有同一套数据：友链的 rss_url 会镜像成 rss_subscriptions 订阅，
 * 定时任务把文章抓进 feed_items。所以这里直接读聚合好的分组数据，
 * 不再在页面里另写一套抓取逻辑。
 */

interface FriendPost {
  title: string;
  link: string;
  description: string;
  pubDate: number;
}

interface FriendItem {
  id: number;
  name: string;
  url: string;
  avatar: string;
  desc: string;
  group: string;
  posts: FriendPost[];
}

interface FriendsProps {
  friends?: FriendItem[];
  total?: number;
  withPosts?: number;
}

/** 原版用 date('n/j') 展示动态时间，例如 11/14。 */
function formatPostDate(pubDate: number) {
  const value = Number(pubDate || 0);
  if (!value) return '';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function FriendsPage({ friends = [] }: FriendsProps) {
  const [brokenAvatars, setBrokenAvatars] = useState<Record<number, boolean>>({});
  const list = Array.isArray(friends) ? friends : [];

  // 头像挂载后主动查一遍：SSR 输出的 <img> 在 React 接管之前就可能已经
  // 加载失败（对方站点防盗链返回 403 很常见），onError 那时还没绑上，
  // 事件就丢了 —— 只能等挂载后检查 complete/naturalWidth 兜底。
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const failed: number[] = [];
    root.querySelectorAll<HTMLImageElement>('img.friend-feed-avatar-img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) {
        const id = Number(img.dataset.friendId || 0);
        if (id) failed.push(id);
      }
    });
    if (!failed.length) return;
    setBrokenAvatars((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of failed) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [list.length]);

  return (
    <article className="article standalone-page">
      <div className="friends-feed" ref={rootRef}>
        {list.length === 0 ? (
          <div className="friends-empty">
            <IconLink size={32} />
            <p>暂无友情链接</p>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
              请在后台「友情链接」中添加好友链接
            </p>
          </div>
        ) : (
          list.map((friend) => (
            <div className="friend-feed-card" key={friend.id}>
              <div className="friend-feed-header">
                <div className="friend-feed-avatar">
                  {friend.avatar && !brokenAvatars[friend.id] ? (
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="friend-feed-avatar-img"
                      data-friend-id={friend.id}
                      loading="lazy"
                      onError={() => setBrokenAvatars((prev) => ({ ...prev, [friend.id]: true }))}
                    />
                  ) : (
                    <div className="friend-feed-avatar-text">{friend.name.slice(0, 1)}</div>
                  )}
                </div>
                <div className="friend-feed-info">
                  <span className="friend-feed-name">{friend.name}</span>
                  {friend.desc ? <div className="friend-feed-desc">{friend.desc}</div> : null}
                </div>
                <a
                  className="friend-feed-visit"
                  href={friend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`访问 ${friend.name}`}
                  aria-label={`访问 ${friend.name}`}
                >
                  <IconArrowRight size={13} />
                </a>
              </div>

              {friend.posts.length ? (
                <div className="friend-feed-posts">
                  {friend.posts.map((post) => (
                    <a
                      className="friend-feed-item"
                      key={`${friend.id}-${post.link || post.title}`}
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="friend-feed-item-head">
                        <span className="friend-feed-item-title">{post.title}</span>
                        <span className="friend-feed-item-date">{formatPostDate(post.pubDate)}</span>
                      </div>
                      {post.description ? (
                        <div className="friend-feed-item-desc">{plainText(post.description, 120)}</div>
                      ) : null}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="friend-feed-no-posts">暂无文章</div>
              )}
            </div>
          ))
        )}
      </div>
    </article>
  );
}
