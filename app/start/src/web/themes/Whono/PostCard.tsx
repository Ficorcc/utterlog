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
 * Whono 的列表行：标题 + 日期一行，下面接摘要和标签。
 * 首页、分类页、标签页共用同一套行式排版，避免三处各写一份。
 */
export default function PostCard({ post }: { post: CardPost }) {
  const { timeZone } = useThemeContext();
  const date = formatDateInTimeZone(
    postDateInput(post),
    'zh-CN',
    { year: 'numeric', month: '2-digit', day: '2-digit' },
    timeZone,
  );
  const excerpt = plainText(post?.excerpt, 180);
  const tags = post?.tags || [];

  return (
    <PostLink post={post} className="wh-list-item">
      <div className="wh-item-row">
        <h3 className="wh-item-title">{post?.title || '无标题'}</h3>
        <time className="wh-item-date">{date}</time>
      </div>
      {excerpt ? <p className="wh-item-excerpt">{excerpt}</p> : null}
      {tags.length ? (
        <div className="wh-meta-line">
          {tags.slice(0, 4).map((tag) => (
            <span className="wh-tag" key={tag.id}>
              #{tag.name}
            </span>
          ))}
        </div>
      ) : null}
    </PostLink>
  );
}
