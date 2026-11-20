'use client';

import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { postDateInput } from '@/lib/post-date';
import { categoryColor, excerptOf, postDateTimeLabel } from './utils';

/**
 * 分类页：对照上游 pages/category.php + inc/category-post-card.php。
 *
 *   .category-page > .category-shell
 *     .category-hero            分类头（图标 / 名称 / 统计）
 *     .category-post-list       文章列表（卡片式）
 */

/** 分类下的文章统计：上游由服务端聚合，这里用当前列表现算 */
function categoryStats(posts: any[]) {
  return posts.reduce(
    (acc, post) => ({
      views: acc.views + Number(post?.view_count || 0),
      words: acc.words + Number(post?.word_count || 0),
      comments: acc.comments + Number(post?.comment_count || 0),
    }),
    { views: 0, words: 0, comments: 0 },
  );
}

export default function CategoryPage({
  category,
  posts = [],
  timeZone = 'UTC',
}: {
  category: any;
  posts?: any[];
  timeZone?: string;
}) {
  const { categories } = useThemeContext();
  const list = Array.isArray(posts) ? posts : [];

  // 色板按分类在列表中的次序循环，与上游 colorIndex() 一致
  const index = categories.findIndex((item: any) => Number(item?.id) === Number(category?.id));
  const color = categoryColor(index < 0 ? 0 : index);
  const icon = category?.icon || 'fa-regular fa-folder';
  const stats = categoryStats(list);

  const headline = [
    { icon: 'fa-regular fa-file-lines', value: list.length, label: '篇文章' },
    { icon: 'fa-regular fa-eye', value: stats.views, label: '阅读' },
    { icon: 'fa-solid fa-keyboard', value: stats.words, label: '字' },
    { icon: 'fa-regular fa-comment', value: stats.comments, label: '评论' },
  ];

  return (
    <section className="category-page">
      <div className="category-shell">
        <header className={`category-hero cat-color-${color}`}>
          <div className="category-hero-top">
            <span className="category-hero-kicker">Category</span>
            <div className="category-hero-meta">
              {headline.map((item) => (
                <span key={item.label} className="category-hero-stat">
                  <i className={item.icon} aria-hidden="true" /> {item.value.toLocaleString()} {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="category-hero-headline">
            <div className="category-hero-ico">
              <i className={icon} aria-hidden="true" />
            </div>
            <h1 className="category-hero-name">{category?.name || ''}</h1>
            {category?.description ? <p className="category-hero-desc">{category.description}</p> : null}
          </div>
        </header>

        <div className="js-list-items home-list home-post-list category-post-list" data-category-feed-list>
          {list.length === 0 ? <p className="empty category-empty">该分类下还没有文章</p> : null}
          {list.map((post: any) => (
            <article className="home-card home-card--post post-card category-post-card" key={post.id}>
              <div className="home-card-body home-post-main">
                <div className="home-post-title-row category-post-title-row">
                  <h2 className="home-post-title">
                    <PostLink post={post}>{post.title}</PostLink>
                  </h2>
                </div>
                <p className="category-post-excerpt">{excerptOf(post, 150)}</p>
              </div>
              <footer className="category-post-meta-row" aria-label="文章信息">
                <time className="category-post-time" dateTime={String(postDateInput(post) || '')}>
                  {postDateTimeLabel(post, timeZone)}
                </time>
                <div className="category-post-meta-stats">
                  <span className="home-post-stats">
                    <i className="fa-regular fa-eye" aria-hidden="true" />
                    {Number(post.view_count || 0).toLocaleString()}
                  </span>
                  <span className="home-post-stats">
                    <i className="fa-regular fa-comment" aria-hidden="true" />
                    {Number(post.comment_count || 0)}
                  </span>
                </div>
              </footer>
            </article>
          ))}
        </div>

        {list.length ? (
          <div className="archive-category-foot">
            <span>
              <Link prefetch={false} href="/archives">
                <i className="fa-solid fa-box-archive" aria-hidden="true" /> 查看全部归档
              </Link>
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
