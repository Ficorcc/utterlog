'use client';

// 朋友圈页的应用层默认实现（主题没有接管时使用）。
//
// 数据由服务端聚合好：每个订阅源（= 一条有 rss_url 的友链）是一组，
// 组内是该订阅抓到的最新几篇文章。这里只负责渲染。

import PageTitle from '@/components/blog/PageTitle';

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
  posts: FriendPost[];
}

function formatDate(value: number) {
  const time = Number(value || 0);
  if (!time) return '';
  const date = new Date(time * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function FriendsClient({ friends = [] }: { friends?: FriendItem[] }) {
  const list = Array.isArray(friends) ? friends : [];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 32 }}>
      <PageTitle title="朋友圈" icon="fa-regular fa-rss" />
      {list.length === 0 ? (
        <p style={{ color: 'var(--text-light)' }}>暂无好友动态</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {list.map((friend) => (
            <section
              key={friend.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {friend.avatar ? (
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    width={40}
                    height={40}
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={friend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}
                  >
                    {friend.name}
                  </a>
                  {friend.desc ? (
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{friend.desc}</div>
                  ) : null}
                </div>
              </div>
              {friend.posts.length ? (
                <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
                  {friend.posts.map((post) => (
                    <li key={`${friend.id}-${post.link || post.title}`} style={{ padding: '6px 0' }}>
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text)', textDecoration: 'none' }}
                      >
                        {post.title}
                      </a>
                      <span style={{ fontSize: 12, color: 'var(--text-light)', marginLeft: 8 }}>
                        {formatDate(post.pubDate)}
                      </span>
                      {post.description ? (
                        <div style={{ fontSize: 13, color: 'var(--text-light)' }}>{post.description}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 12 }}>暂无文章</div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
