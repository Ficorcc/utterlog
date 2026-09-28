import { parseIconLinks, type DiscoverLink } from './discover-links';
export const HERO_SOCIAL_LINKS_KEY = 'shanying_hero_social_links';
const networks: Record<string, [string, string]> = {
  github: ['fa-brands fa-github', 'GitHub'], x: ['fa-brands fa-x-twitter', 'X'], twitter: ['fa-brands fa-x-twitter', 'X'],
  mastodon: ['fa-brands fa-mastodon', 'Mastodon'], qq: ['fa-brands fa-qq', 'QQ'],
  weibo: ['fa-brands fa-weibo', '微博'], bilibili: ['fa-brands fa-bilibili', '哔哩哔哩'],
  telegram: ['fa-brands fa-telegram', 'Telegram'], email: ['fa-regular fa-envelope', '邮箱'],
  rss: ['fa-solid fa-rss', 'RSS'], youtube: ['fa-brands fa-youtube', 'YouTube'],
  instagram: ['fa-brands fa-instagram', 'Instagram'], wechat: ['fa-brands fa-weixin', '微信'],
};
export function heroSocialLinks(options: Record<string, unknown>): DiscoverLink[] {
  const saved = options[HERO_SOCIAL_LINKS_KEY];
  if (saved != null && saved !== '') return parseIconLinks(saved);
  const inherited: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    if (key.startsWith('social_') && key !== 'social_links' && typeof value === 'string' && value) inherited[key.slice(7)] = value;
  }
  try {
    const entries = typeof options.social_links === 'string' ? JSON.parse(options.social_links) : options.social_links;
    if (Array.isArray(entries)) for (const item of entries) {
      const name = String(item?.name || '').trim().toLowerCase();
      const key = ({ '微博': 'weibo', '邮箱': 'email', '微信': 'wechat', '哔哩哔哩': 'bilibili', 'b 站': 'bilibili' } as Record<string, string>)[name] || name;
      if (key && typeof item?.url === 'string' && !inherited[key]) inherited[key] = item.url;
    }
  } catch { /* Keep existing flat settings when legacy JSON is invalid. */ }
  return Object.entries(inherited).map(([key, href]) => {
    const [icon, label] = networks[key.toLowerCase()] || ['fa-solid fa-link', key];
    return { icon, label, href };
  });
}
