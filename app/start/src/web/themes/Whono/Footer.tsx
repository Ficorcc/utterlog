import Link from '@/components/AppLink';
import { useThemeContext } from '@/lib/theme-context';
import { safeHref } from './utils';

export default function Footer() {
  const { site, menus, archiveStats } = useThemeContext();
  const links = (menus.footer || []).filter((item) => safeHref(item.href));
  const postCount = Number(archiveStats?.post_count || 0);
  const views = Number(archiveStats?.total_views || 0);

  return (
    <footer className="wh-footer">
      {links.length > 0 ? (
        <nav aria-label="页脚导航">
          {links.map((item, index) => (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <span>
        © {site.title}
        {postCount > 0 ? ` · 共 ${postCount} 篇` : ''}
        {views > 0 ? ` · ${views.toLocaleString()} 次浏览` : ''}
      </span>

      <span>
        Whono 主题 · Powered by{' '}
        <a href="https://utterlog.com" target="_blank" rel="noopener noreferrer">
          Utterlog
        </a>
      </span>
    </footer>
  );
}
