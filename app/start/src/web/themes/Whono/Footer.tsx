import { useThemeContext } from '@/lib/theme-context';

/**
 * 页脚：对齐 astro-whono 原版 —— 单行淡色版权文字，无导航菜单。
 * 格式：© {年份} {站名} · Power by Utterlog & Theme by Whono
 */
export default function Footer() {
  const { site } = useThemeContext();
  const year = new Date().getFullYear();

  return (
    <footer className="wh-footer">
      <span>
        © {year} {site.title} · Power by{' '}
        <a href="https://utterlog.com" target="_blank" rel="noopener noreferrer">
          Utterlog
        </a>{' '}
        &amp; Theme by Whono
      </span>
    </footer>
  );
}
