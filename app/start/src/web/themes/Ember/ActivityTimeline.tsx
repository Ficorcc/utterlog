'use client';

import { datePartsInTimeZone, formatDateInTimeZone } from '@/lib/timezone';

/**
 * 动态时间线（上游 pages/activity.php + inc/activity-item.php 的结构）。
 *
 * 数据源是「友链 + RSS 订阅」合并出的好友动态：
 *   friends[].posts[] = 每个订阅源最近的文章。
 * 朋友圈页（/friends）和订阅页（/feeds）用的是同一份数据，差别只是
 * 朋友圈页多一条「按好友筛选」的好友标签栏，订阅页不要。
 */

export interface FriendPost {
  title: string;
  link: string;
  description: string;
  pubDate: number;
}

export interface FriendItem {
  id: number;
  name: string;
  url: string;
  avatar: string;
  desc: string;
  group: string;
  posts: FriendPost[];
}

export interface TimelineEntry {
  friend: FriendItem;
  post: FriendPost;
}

/** 距今几天（按站点时区计算） */
export function daysAgo(timestamp: number, timeZone: string) {
  const now = datePartsInTimeZone(new Date(), timeZone);
  const then = datePartsInTimeZone(timestamp * 1000, timeZone);
  if (!now.year || !then.year) return 0;
  const today = Date.UTC(now.year, now.month - 1, now.day);
  const that = Date.UTC(then.year, then.month - 1, then.day);
  return Math.floor((today - that) / 86400000);
}

export function dayLabel(timestamp: number, timeZone: string) {
  const days = daysAgo(timestamp, timeZone);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
}

export function monthDay(timestamp: number, timeZone: string) {
  const { month, day } = datePartsInTimeZone(timestamp * 1000, timeZone);
  if (!month || !day) return '';
  return `${month}.${day}`;
}

export function hourMinute(timestamp: number, timeZone: string) {
  return formatDateInTimeZone(timestamp * 1000, 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }, timeZone);
}

/** 把好友列表摊平成按发布时间倒序的动态流 */
export function buildTimeline(friends: any[], activeFriend: number | null): TimelineEntry[] {
  const rows: TimelineEntry[] = [];
  for (const friend of friends) {
    if (activeFriend != null && Number(friend.id) !== activeFriend) continue;
    for (const post of friend.posts || []) rows.push({ friend, post });
  }
  return rows.sort((a, b) => Number(b.post.pubDate || 0) - Number(a.post.pubDate || 0));
}

export default function ActivityTimeline({
  friends,
  activeFriend = null,
  timeZone,
  emptyText = '还没有动态',
}: {
  friends: any[];
  activeFriend?: number | null;
  timeZone: string;
  emptyText?: string;
}) {
  const items = buildTimeline(friends, activeFriend);

  if (items.length === 0) return <p className="empty">{emptyText}</p>;

  return (
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
  );
}
