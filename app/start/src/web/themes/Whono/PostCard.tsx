import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import { formatDateInTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';
import { plainText } from './utils';

interface CardPost {
  id: number;
  title?: string;
  excerpt?: string;
  tags?: { id: number; name: string; slug: string }[];
  published_at?: string | number | null;
  created_at?: string | number;
}

/**
 * Whono 的列表行（对齐 astro-whono 原版）：
 * 标题一行 → 楷体摘要 → 元信息行「发布于：YYYY-MM-DD · #标签」。
 * 首页、分类页、标签页共用同一套行式排版，避免三处各写一份。
 */
export default function PostCard({ post }: { post: CardPost }) {
  const { timeZone } = useThemeContext();
  const date = formatDateInTimeZone(
    postDateInput(post),
    'zh-CN',
    { year: 'numeric', month: '2-digit', day: '2-digit' },
    timeZone,
  ).replaceAll('/', '-');
  const excerpt = plainText(post?.excerpt, 180);
  const tags = post?.tags || [];

  return (
    <PostLink post={post} className="wh-list-item">
      <div className="wh-item-row">
        <h3 className="wh-item-title">{post?.title || '无标题'}</h3>
      </div>
      {excerpt ? <p className="wh-item-excerpt">{excerpt}</p> : null}
      {tags.length ? (
        <div className="wh-meta-line">
          <span className="wh-meta-date">发布于：{date}</span>
          {tags.slice(0, 4).map((tag) => (
            <span className="wh-tag" key={tag.id}>
              #{tag.name}
            </span>
          ))}
        </div>
      ) : (
        <div className="wh-meta-line">
          <span className="wh-meta-date">发布于：{date}</span>
        </div>
      )}
    </PostLink>
  );
}
