import type { MenuItem } from '@/lib/theme-context';

/**
 * 导航图标映射。
 *
 * 上游的图标是一套「menu-icons」SVG 掩码（主题样式表按 data-glaze-icon 挂载），
 * 这里把站内路由映射到对应图标名；菜单项自带 fa- 类名图标时优先用自带图标。
 */

export const GLAZE_ICON_NAMES = [
  'about', 'account', 'ai', 'album', 'analytics', 'archives', 'bookshelf', 'categories',
  'coding', 'contact', 'daily-log', 'design', 'donate', 'download', 'faq', 'feeds', 'film',
  'fitness', 'food', 'gaming', 'guestbook', 'home', 'learning', 'life', 'links', 'misc',
  'mood', 'music-sharing', 'nature', 'newsletter', 'now', 'photography', 'podcast',
  'portfolio', 'privacy', 'projects', 'reading', 'search', 'sitemap', 'stats', 'tags',
  'talks', 'technology', 'terms', 'travel', 'tutorials', 'updates', 'uses', 'video', 'work',
  'social-bilibili', 'social-bluesky', 'social-codepen', 'social-discord', 'social-dribbble',
  'social-facebook', 'social-github', 'social-gitlab', 'social-instagram', 'social-linkedin',
  'social-mastodon', 'social-medium', 'social-npm', 'social-pinterest', 'social-reddit',
  'social-sinaweibo', 'social-stackoverflow', 'social-telegram', 'social-tencentqq',
  'social-threads', 'social-tiktok', 'social-twitch', 'social-wechat', 'social-x',
  'social-xiaohongshu', 'social-youtube', 'social-zhihu',
] as const;

export type GlazeIconName = (typeof GLAZE_ICON_NAMES)[number];

const ROUTE_ICONS: Array<[string, GlazeIconName]> = [
  ['/archives', 'archives'],
  ['/categories', 'categories'],
  ['/tags', 'tags'],
  ['/moments', 'talks'],
  ['/links', 'links'],
  ['/friends', 'links'],
  ['/feeds', 'feeds'],
  ['/about', 'about'],
  ['/guestbook', 'guestbook'],
  ['/search', 'search'],
  ['/dashboard', 'analytics'],
  ['/movies', 'film'],
  ['/music', 'music-sharing'],
  ['/albums', 'album'],
  ['/books', 'bookshelf'],
  ['/games', 'gaming'],
  ['/goods', 'misc'],
  ['/annual', 'stats'],
  ['/footprints', 'now'],
  ['/coding', 'coding'],
];

const SOCIAL_ICONS: Record<string, GlazeIconName> = {
  github: 'social-github',
  twitter: 'social-x',
  x: 'social-x',
  weibo: 'social-sinaweibo',
  telegram: 'social-telegram',
  youtube: 'social-youtube',
  instagram: 'social-instagram',
  weixin: 'social-wechat',
  bilibili: 'social-bilibili',
  douyin: 'social-tiktok',
  tiktok: 'social-tiktok',
  douban: 'misc',
  linkedin: 'social-linkedin',
  mastodon: 'social-mastodon',
  discord: 'social-discord',
  zhihu: 'social-zhihu',
  npm: 'social-npm',
  codepen: 'social-codepen',
  medium: 'social-medium',
  reddit: 'social-reddit',
  pinterest: 'social-pinterest',
  stackoverflow: 'social-stackoverflow',
  threads: 'social-threads',
  xiaohongshu: 'social-xiaohongshu',
  bluesky: 'social-bluesky',
  gitlab: 'social-gitlab',
  dribbble: 'social-dribbble',
  facebook: 'social-facebook',
  qq: 'social-tencentqq',
};

/** 路径 → 图标名 */
export function iconForPath(href: string): GlazeIconName {
  const path = String(href || '').split('?')[0].replace(/\/+$/, '') || '/';
  for (const [prefix, icon] of ROUTE_ICONS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return icon;
  }
  return 'home';
}

export function isFaIcon(value: unknown): value is string {
  return typeof value === 'string' && /\bfa[srlbd]?\b/.test(value);
}

/** 菜单项图标：自带 fa- 图标优先，其次按路径推断 */
export function menuItemIcon(item: MenuItem): { fa?: string; glaze?: GlazeIconName } {
  if (isFaIcon(item.icon)) return { fa: item.icon };
  if (typeof item.icon === 'string' && (GLAZE_ICON_NAMES as readonly string[]).includes(item.icon)) {
    return { glaze: item.icon as GlazeIconName };
  }
  return { glaze: iconForPath(item.href) };
}

export function socialIcon(key: string): GlazeIconName | null {
  return SOCIAL_ICONS[String(key || '').toLowerCase()] || null;
}

/**
 * 上游把 4 个汉字的菜单名拆成两行显示（dock 图标下方的小字）。
 * 这里保持同样的排版，其余长度原样输出。
 */
export function splitMenuLabel(label: string): [string, string] | null {
  const text = String(label || '').trim();
  if (text.length === 4 && /[一-龥]{4}/.test(text)) {
    return [text.slice(0, 2), text.slice(2)];
  }
  return null;
}

/** 没有配置菜单时的兜底项 */
export const FALLBACK_MENU: MenuItem[] = [
  { href: '/', label: '首页' },
  { href: '/archives', label: '归档' },
  { href: '/moments', label: '说说' },
  { href: '/links', label: '友链' },
  { href: '/about', label: '关于' },
];
