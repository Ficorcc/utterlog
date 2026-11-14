'use client';

import PostLink from '@/components/blog/PostLink';
import { IconChat, IconEye, IconTime } from './Icons';
import { formatDate, plainText } from './utils';

interface CardPost {
  id: number;
  slug?: string;
  title?: string;
  excerpt?: string;
  cover_url?: string;
  view_count?: number;
  comment_count?: number;
  word_count?: number;
  published_at?: string | number | null;
  created_at?: string | number;
  categories?: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
}

/**
 * 列表卡片（首页 / 分类页 / 标签页 / 归档页共用）。
 * 结构对齐原主题的 .post-card-simple：标题、摘要、三项元信息。
 */
export default function PostCard({ post }: { post: CardPost }) {
  const excerpt = plainText(post?.excerpt, 120);

  return (
    <PostLink post={post} className="post-card-simple">
      <div className="pcs-body">
        <h3 className="pcs-title">{post?.title || '无标题'}</h3>
        {excerpt ? <p className="pcs-excerpt">{excerpt}</p> : null}
        <div className="pcs-meta">
          <span className="pcs-meta-item">
            <IconTime size={13} />
            {formatDate(post?.published_at || post?.created_at)}
          </span>
          <span className="pcs-meta-item">
            <IconEye size={13} />
            {Number(post?.view_count || 0)}
          </span>
          <span className="pcs-meta-item">
            <IconChat size={13} />
            {Number(post?.comment_count || 0)}
          </span>
        </div>
      </div>
    </PostLink>
  );
}
