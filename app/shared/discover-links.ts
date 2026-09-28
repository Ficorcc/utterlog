export interface DiscoverLink { icon: string; label: string; href?: string; copy?: string }
export const DISCOVER_LINKS_KEY = 'shanying_discover_links';
export function parseIconLinks(value: unknown): DiscoverLink[] {
  try {
    const items = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && typeof item.icon === 'string' && typeof item.label === 'string').map(item => ({
      icon: item.icon.trim(), label: item.label.trim(),
      ...(typeof item.href === 'string' ? { href: item.href.trim() } : {}),
      ...(typeof item.copy === 'string' ? { copy: item.copy.trim() } : {}),
    })).filter(item => item.icon && item.label);
  } catch { return []; }
}
export function discoverLinks(options: Record<string, unknown>): DiscoverLink[] {
  // An explicitly saved empty list hides every link. Only unset settings inherit.
  if (options[DISCOVER_LINKS_KEY] != null && options[DISCOVER_LINKS_KEY] !== '') return parseIconLinks(options[DISCOVER_LINKS_KEY]);
  return [
    { icon: 'fa-solid fa-train', label: '开往 · 发现更多博客', href: 'https://www.travellings.cn/go.html' },
    { icon: 'fa-solid fa-blog', label: '十年之约 · 探索更多文章', href: 'https://www.foreverblog.cn/go.html' },
    ...parseIconLinks(options.theme_header_buttons),
  ];
}
