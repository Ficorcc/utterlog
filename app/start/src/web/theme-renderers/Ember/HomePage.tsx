import { useThemeContext } from '@/lib/theme-context';
import PostCard from './PostCard';
import Pagination from './Pagination';

export default function HomePage({ posts, page, totalPages }: { posts: any[]; page: number; totalPages: number }) {
  const { site } = useThemeContext();
  return <div className="ember-home">
    <section className="ember-profile"><div className="ember-avatar">{site.logo ? <img src={site.logo} alt="" /> : <span>{(site.title || 'U').slice(0, 1)}</span>}</div><div><p className="ember-kicker">PERSONAL JOURNAL</p><h1>{site.title || 'Utterlog'}</h1><p>{site.subtitle || site.description || '记录日常，也收藏时间。'}</p></div></section>
    <div className="ember-section-title"><span>最近更新</span><i /></div>
    {posts.length > 0 ? <div className="ember-post-list">{posts.map((post, index) => <PostCard key={post.id} post={post} priority={index === 0} />)}</div> : <div className="ember-empty">这里还没有文章。</div>}
    <Pagination currentPage={page} totalPages={totalPages} />
  </div>;
}
