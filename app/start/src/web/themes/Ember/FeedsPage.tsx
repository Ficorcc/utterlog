'use client';

import { useThemeContext } from '@/lib/theme-context';
import ActivityTimeline from './ActivityTimeline';

/**
 * 订阅页（/feeds）。
 *
 * 上游 ember 的导航里也有「订阅」（/subscribe），但上游没给这一页做模板。
 * 本项目的订阅数据来自友链 + RSS 订阅（friendsFeed()），和朋友圈页同一份，
 * 所以这里沿用上游动态页的结构：标题条 + 统计条 + 时间线，
 * 但不铺朋友圈那套「按好友筛选」的好友标签栏（几百个好友会把动态压到很下面）。
 */
export default function FeedsPage({
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
  const sourceTotal = total ?? list.length;
  const activeCount = withPosts ?? list.filter((friend) => (friend.posts || []).length > 0).length;

  return (
    <section className="activity-page">
      <header className="activity-hero">
        <div className="activity-hero-main">
          <div className="activity-title-mark">
            <span aria-hidden="true" />
            <i className="fa-solid fa-square-rss" aria-hidden="true" />
            <b>FEEDS</b>
            <em>订阅</em>
          </div>
          <p>订阅源抓回来的最新文章，按发布时间倒序铺在这里。</p>
        </div>
      </header>

      <section className="activity-panel">
        <div className="activity-panel-head">
          <h3>订阅动态</h3>
          <span>
            {sourceTotal} 个订阅源 · {activeCount} 个有更新
          </span>
        </div>
      </section>

      <ActivityTimeline
        friends={list}
        timeZone={timeZone}
        variant="feeds"
        emptyText="还没有订阅内容，在后台友链管理里添加 RSS 地址即可"
      />
    </section>
  );
}
