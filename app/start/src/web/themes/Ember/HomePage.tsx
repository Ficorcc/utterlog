import Link from '@/components/AppLink';
import PostCard from './PostCard';
import TalkCard from './TalkCard';

interface FeedItem {
  kind: 'post' | 'moment';
  time: number;
  post?: any;
  moment?: any;
}

function timeValue(value: any) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

/** 上游首页是「文章 + 说说」混排的时间线，这里按时间倒序合并 */
function buildFeed(posts: any[], moments: any[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (const post of posts) {
    items.push({ kind: 'post', time: timeValue(post.published_at || post.created_at), post });
  }
  for (const moment of moments) {
    items.push({ kind: 'moment', time: timeValue(moment.created_at), moment });
  }
  return items.sort((a, b) => b.time - a.time);
}

function PageLink({ to, children, active }: { to: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link href={to} className={active ? 'active' : undefined} prefetch={false}>
      {children}
    </Link>
  );
}

/** 页码序列：首页 / 末页 / 当前页附近，中间用 gap 占位 */
function paginationItems(page: number, totalPages: number): (number | 'gap')[] {
  const pages = new Set<number>([1, totalPages]);
  for (let num = page - 1; num <= page + 1; num += 1) {
    if (num >= 1 && num <= totalPages) pages.add(num);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | 'gap')[] = [];
  sorted.forEach((num, index) => {
    if (index > 0 && num - sorted[index - 1] > 1) items.push('gap');
    items.push(num);
  });
  return items;
}

export default function HomePage({
  posts,
  page,
  totalPages,
  recentMoments,
  latestMoment,
}: {
  posts: any[];
  page: number;
  totalPages: number;
  recentMoments?: any[];
  latestMoment?: any | null;
}) {
  const moments = recentMoments?.length ? recentMoments : latestMoment ? [latestMoment] : [];
  const feed = buildFeed(posts || [], moments);

  return (
    <section className="home-list js-home-feed-list" data-home-feed-list>
      {feed.length === 0 ? <p className="empty">还没有内容</p> : null}
      {feed.map((item, index) =>
        item.kind === 'post'
          ? <PostCard key={`post-${item.post.id}`} post={item.post} priority={index === 0} />
          : <TalkCard key={`moment-${item.moment.id}`} moment={item.moment} />,
      )}

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="分页">
          {page > 1
            ? <PageLink to={page - 1 === 1 ? '/' : `/page/${page - 1}`}>上一页</PageLink>
            : <span>上一页</span>}
          {paginationItems(page, totalPages).map((item, index) =>
            item === 'gap'
              ? <span key={`gap-${index}`}>…</span>
              : item === page
                ? <span key={item} className="active">{item}</span>
                : <PageLink key={item} to={item === 1 ? '/' : `/page/${item}`}>{item}</PageLink>,
          )}
          {page < totalPages
            ? <PageLink to={`/page/${page + 1}`}>下一页</PageLink>
            : <span>下一页</span>}
        </nav>
      ) : null}
    </section>
  );
}
