import { table } from '../config';
import { many } from '../db/helpers';
import { friendLinkAvatar } from './friend-links';

/**
 * 朋友圈（订阅）聚合。
 *
 * 原主题 friends.php 的逻辑是：把每条友链当成一个好友，抓它自己的 RSS，
 * 每人取最新 3 篇文章，卡片按「该好友最新一篇的时间」倒序排列。
 *
 * Utterlog 已经有同一套数据了：后台「友链」里的 rss_url 会自动镜像成
 * rss_subscriptions 订阅，定时任务把文章抓进 feed_items。所以这里不再
 * 重复实现一套抓取器，而是按订阅源分组读现成的 feed_items：
 *
 *   - 一个订阅源 = 一个好友卡片
 *   - 该订阅的 feed_items（按 pub_date 倒序，取前 3 篇）= 好友的动态
 *   - 卡片顺序 = 该好友最新一篇的时间倒序（与原版 usort 一致）
 *
 * 好友的昵称 / 简介 / 头像优先取 links 表（人工填的），订阅表里的
 * site_name / site_avatar 作为兜底。
 */

export type FriendFeedPost = {
  title: string;
  link: string;
  description: string;
  pubDate: number;
};

export type FriendFeedFriend = {
  id: number;
  name: string;
  url: string;
  avatar: string;
  desc: string;
  /** 友链分类；「已失效」的分类会被过滤掉。 */
  group: string;
  posts: FriendFeedPost[];
};

export type FriendsFeedResult = {
  friends: FriendFeedFriend[];
  /** 朋友圈卡片总数（有订阅源的友链数）。 */
  total: number;
  /** 抓到过文章的订阅源数。 */
  withPosts: number;
};

/** 每人最多显示几篇动态，与原版 _friends_parseFeed($body, 3) 一致。 */
const POSTS_PER_FRIEND = 3;

type FriendRow = {
  subscription_id: number;
  site_url: string;
  site_name: string;
  site_avatar: string;
  link_name: string;
  link_desc: string;
  link_logo: string;
  link_email: string;
  link_icon: string;
  link_group: string;
  post_title: string;
  post_link: string;
  post_desc: string;
  post_pub_date: number;
};

export async function friendsFeed(): Promise<FriendsFeedResult> {
  const rows = await many<FriendRow>(
    `select rs.id as subscription_id,
            coalesce(rs.site_url, '') as site_url,
            coalesce(rs.site_name, '') as site_name,
            coalesce(rs.site_avatar, '') as site_avatar,
            coalesce(l.name, '') as link_name,
            coalesce(l.description, '') as link_desc,
            coalesce(l.logo, '') as link_logo,
            coalesce(l.email, '') as link_email,
            coalesce(l.icon_url, '') as link_icon,
            coalesce(l.group_name, '') as link_group,
            coalesce(p.title, '') as post_title,
            coalesce(p.link, '') as post_link,
            coalesce(p.description, '') as post_desc,
            coalesce(p.pub_date, 0) as post_pub_date
       from ${table('rss_subscriptions')} rs
       left join ${table('links')} l on coalesce(l.url, '') = rs.site_url
       left join lateral (
            select fi.title, fi.link, fi.description, fi.pub_date
              from ${table('feed_items')} fi
             where fi.subscription_id = rs.id
             order by fi.pub_date desc, fi.id desc
             limit ${POSTS_PER_FRIEND}
       ) p on true
      where rs.user_id = 1
      order by (select max(fi.pub_date) from ${table('feed_items')} fi
                 where fi.subscription_id = rs.id) desc nulls last, rs.id asc`,
  ).catch(() => [] as FriendRow[]);

  const groups = new Map<number, FriendFeedFriend>();
  for (const row of rows) {
    const key = Number(row.subscription_id);
    let friend = groups.get(key);
    if (!friend) {
      const avatar = String(row.link_logo || '').trim()
        || String(row.site_avatar || '').trim()
        || friendLinkAvatar({ email: row.link_email, logo: '', iconUrl: row.link_icon }, 128);
      friend = {
        id: key,
        name: String(row.link_name || row.site_name || '好友').trim(),
        url: String(row.site_url || '').trim(),
        avatar,
        desc: String(row.link_desc || '').trim().slice(0, 40),
        group: String(row.link_group || '').trim(),
        posts: [],
      };
      groups.set(key, friend);
    }
    const title = String(row.post_title || '').trim();
    if (!title || friend.posts.length >= POSTS_PER_FRIEND) continue;
    friend.posts.push({
      title,
      link: String(row.post_link || '').trim(),
      description: String(row.post_desc || '').trim(),
      pubDate: Number(row.post_pub_date || 0),
    });
  }

  const friends = Array.from(groups.values()).filter((friend) => {
    if (!friend.url) return false;
    // 「已失效」分类的友链不参与动态展示 —— 原版 friends.php 也是按
    // sort 字段这样过滤的（'已失效' 分类的友链不再参与动态抓取）。
    return !isDeadGroup(friend.group);
  });

  return {
    friends,
    total: friends.length,
    withPosts: friends.filter((friend) => friend.posts.length > 0).length,
  };
}

/** 判断友链是否落在「已失效」分类里。 */
function isDeadGroup(groupName: string) {
  return String(groupName || '').includes('已失效');
}
