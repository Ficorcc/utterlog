'use client';

import { useMemo, useState } from 'react';
import { useThemeContext } from '@/lib/theme-context';
import ActivityTimeline from './ActivityTimeline';

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
  const list: any[] = Array.isArray(friends) ? friends : [];
  const [activeFriend, setActiveFriend] = useState<number | null>(null);

  const items = useMemo(() => {
    const rows: { friend: any; post: any }[] = [];
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

      <ActivityTimeline friends={list} activeFriend={activeFriend} timeZone={timeZone} emptyText="还没有动态" />
    </section>
  );
}
