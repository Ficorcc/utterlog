'use client';

import { useMemo, useState } from 'react';
import { datePartsInTimeZone, formatDateInTimeZone } from '@/lib/timezone';
import { useThemeContext } from '@/lib/theme-context';

/**
 * 朋友圈页：上游没有这一页，这里借用动态页（pages/activity.php）的
 * 时间线结构 + inc/activity-item.php 的条目样式，
 * 把每个友链的最新文章铺成一条动态流。
 *
 *   .activity-page
 *     .activity-hero              标题
 *     .activity-source-tabs       按好友筛选
 *     .activity-timeline          动态条目
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

/** 距今几天（按站点时区计算） */
function daysAgo(timestamp: number, timeZone: string) {
  const now = datePartsInTimeZone(new Date(), timeZone);
  const then = datePartsInTimeZone(timestamp * 1000, timeZone);
  if (!now.year || !then.year) return 0;
  const today = Date.UTC(now.year, now.month - 1, now.day);
  const that = Date.UTC(then.year, then.month - 1, then.day);
  return Math.floor((today - that) / 86400000);
}

function dayLabel(timestamp: number, timeZone: string) {
  const days = daysAgo(timestamp, timeZone);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
}

function monthDay(timestamp: number, timeZone: string) {
  const { month, day } = datePartsInTimeZone(timestamp * 1000, timeZone);
  if (!month || !day) return '';
  return `${month}.${day}`;
}

function hourMinute(timestamp: number, timeZone: string) {
  return formatDateInTimeZone(timestamp * 1000, 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }, timeZone);
}

export default function FriendsPage({
  friends = [],
  total,
  withPosts,
}: {
  friends?: any[];
  total?: number;
  withPosts?: number;
}) {
  const { timeZone } = useThemeContext();
  const list: FriendItem[] = Array.isArray(friends) ? friends : [];
  const [activeFriend, setActiveFriend] = useState<number | null>(null);

  const items = useMemo(() => {
    const rows: { friend: FriendItem; post: FriendPost }[] = [];
    for (const friend of list) {
      if (activeFriend != null && Number(friend.id) !== activeFriend) continue;
      for (const post of friend.posts || []) rows.push({ friend, post });
    }
    return rows.sort((a, b) => Number(b.post.pubDate || 0) - Number(a.post.pubDate || 0));
  }, [list, activeFriend]);

  const friendTotal = total ?? list.length;
  const activeCount = withPosts ?? list.filter((friend) => (friend.posts || []).length > 0).length;

  return (
    <section className="activity-page">
      <header className="activity-hero">
        <div className="activity-hero-main">
          <div className="activity-title-mark">
            <span aria-hidden="true" />
            <i className="fa-solid fa-share-nodes" aria-hidden="true" />
            <b>FRIENDS</b>
            <em>朋友圈</em>
          </div>
          <p>友情链接的最新文章，按发布时间倒序铺在这里。</p>
        </div>
      </header>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>订阅动态</h3>
          <span>
            {friendTotal} 个好友 · {activeCount} 个有更新
          </span>
        </div>
      </section>

      {list.length > 1 ? (
        <nav className="activity-source-tabs" aria-label="按好友筛选">
          <a
            href="/friends"
            className={activeFriend == null ? 'active' : ''}
            onClick={(event) => {
              event.preventDefault();
              setActiveFriend(null);
            }}
          >
            <i className="fa-solid fa-layer-group" aria-hidden="true" />
            <span>全部</span>
            <b>{items.length}</b>
          </a>
          {list.map((friend) => (
            <a
              key={friend.id}
              href="/friends"
              className={activeFriend === Number(friend.id) ? 'active' : ''}
              onClick={(event) => {
                event.preventDefault();
                setActiveFriend(Number(friend.id));
              }}
            >
              <i className="fa-solid fa-user-group" aria-hidden="true" />
              <span>{friend.name}</span>
              <b>{(friend.posts || []).length}</b>
            </a>
          ))}
        </nav>
      ) : null}

      {items.length === 0 ? <p className="empty">还没有动态</p> : null}

      <div className="activity-timeline">
        {items.map((item, index) => {
          const { friend, post } = item;
          const published = Number(post.pubDate || 0);
          return (
            <article className="activity-item activity-type-blog" id={`activity-${friend.id}-${index}`} key={`${friend.id}-${index}`}>
              <time className="activity-item-time" dateTime={published ? String(published) : undefined}>
                <strong>{dayLabel(published, timeZone)}</strong>
                <small>{monthDay(published, timeZone)}</small>
              </time>
              <span className="activity-item-line" aria-hidden="true" />
              <span className="activity-item-icon">
                <i className="fa-regular fa-file-lines" aria-hidden="true" />
              </span>
              <div className="activity-item-body">
                <div className="activity-item-meta">
                  <span>{hourMinute(published, timeZone)}</span>
                  <span>发布了</span>
                  <span>文章</span>
                  <span>{friend.name}</span>
                </div>
                <div className="activity-item-title">
                  {post.link ? (
                    <a href={post.link} target="_blank" rel="nofollow noopener">
                      {post.title}
                    </a>
                  ) : (
                    <span>{post.title}</span>
                  )}
                </div>
                {post.description ? <div className="activity-item-content">{post.description}</div> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
