import { createHash } from 'node:crypto';
import { config, table } from '../config';
import { many } from '../db/helpers';
import { readResolvedOptionMap } from '../services/options';

async function optionMap(includeSensitive: boolean) {
  return readResolvedOptionMap(includeSensitive);
}

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}

function xmlEscape(value: string) {
  return htmlEscape(value);
}

function boolOptionValue(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
  }
  return fallback;
}

function siteOrigin(opts: Record<string, string>) {
  return String(opts.site_url || config.appUrl || '').replace(/\/+$/, '');
}

// 订阅源的摘要要的是纯文本：Markdown 符号（#、**、[]() 等）与 HTML 标签
// 在阅读器里只会成为噪音，统一清洗掉。
function stripFeedMarkup(value: string) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/[*_~]{1,3}([^*_~\n]+)[*_~]{1,3}/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 摘要来源优先级：AI 摘要 > 文章摘要 > 清洗后的正文。
function feedSummaryText(post: Record<string, unknown>) {
  const ai = String(post.ai_summary || '').trim();
  const excerpt = String(post.excerpt || '').trim();
  const content = String(post.content || '').trim();
  return oneLine(ai || excerpt || stripFeedMarkup(content), 500);
}

function oneLine(value: string, limit = 240) {
  let text = String(value || '').trim().replace(/\r?\n/g, ' ');
  while (text.includes('  ')) text = text.replaceAll('  ', ' ');
  return [...text].length > limit ? `${[...text].slice(0, limit).join('')}...` : text;
}

const RSS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function parseNaiveWallClock(text: string, timeZone: string): Date | null {
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4] ?? 0);
  const mi = Number(m[5] ?? 0);
  const s = Number(m[6] ?? 0);
  const target = Date.UTC(y, mo - 1, d, h, mi, s);
  if (!timeZone || timeZone === 'UTC') return new Date(target);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  let ts = target;
  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(new Date(ts));
    const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
    const got = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second'));
    const diff = target - got;
    if (diff === 0) break;
    ts += diff;
  }
  return new Date(ts);
}

function parsePostPublishedDate(
  post: { published_at?: unknown; created_at?: unknown },
  timeZone = 'UTC',
): Date {
  const raw = post.published_at ?? post.created_at ?? 0;
  if (typeof raw === 'number' || /^\d+$/.test(String(raw))) {
    const n = Number(raw);
    const date = new Date(n > 1e9 && n < 1e10 ? n * 1000 : n);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const text = String(raw).trim();
  if (!text) return new Date();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const naive = parseNaiveWallClock(text, timeZone);
  if (naive) return naive;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatTimezoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date);
  const tzName = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return '+0000';
  const sign = match[1];
  const hh = String(match[2]).padStart(2, '0');
  const mm = String(match[3] || '00').padStart(2, '0');
  return `${sign}${hh}${mm}`;
}

function formatRfc822InTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const month = RSS_MONTHS[Number(pick('month')) - 1] || 'Jan';
  const offset = formatTimezoneOffset(date, timeZone);
  return `${weekday}, ${pick('day')} ${month} ${pick('year')} ${pick('hour')}:${pick('minute')}:${pick('second')} ${offset}`;
}

function formatIso8601InTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  const offset = formatTimezoneOffset(date, timeZone);
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick('second')}${offset.slice(0, 3)}:${offset.slice(3)}`;
}

function postDateParts(
  post: { published_at?: unknown; created_at?: unknown },
  timeZone = 'UTC',
) {
  const date = parsePostPublishedDate(post, timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    iso: date.toISOString(),
  };
}

function formatRssPubDate(
  post: { published_at?: unknown; created_at?: unknown },
  timeZone = 'UTC',
) {
  return formatRfc822InTimeZone(parsePostPublishedDate(post, timeZone), timeZone);
}

function rssItemLimit(opts: Record<string, string>) {
  const configured = Number(String(opts.rss_items || '').trim());
  if (Number.isFinite(configured) && configured > 0) return Math.min(100, Math.max(1, Math.floor(configured)));
  return 20;
}

function cdata(value: string) {
  return `<![CDATA[${String(value || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

async function loadPublishedPostsForFeed(limit = 50) {
  return many<Record<string, unknown>>(
    `select p.id, p.slug, p.display_id, p.title, p.excerpt, p.content, p.created_at, p.published_at,
            p.ai_summary, coalesce(nullif(au.nickname, ''), au.username, '') as author_name,
            coalesce((
              select m.slug from ${table('relationships')} r
              join ${table('metas')} m on m.id = r.meta_id and m.type = 'category'
              where r.post_id = p.id order by m.id asc limit 1
            ), '') as category_slug
     from ${table('posts')} p
     left join ${table('users')} au on au.id = p.author_id
     where p.status = 'publish' and p.type = 'post'
     order by coalesce(p.published_at, to_timestamp(p.created_at)) desc nulls last, p.id desc
     limit $1`,
    [limit],
  ).catch(() => []);
}

function buildRssFeedXml(opts: Record<string, string>, posts: Record<string, unknown>[]) {
  const site = siteOrigin(opts);
  const timeZone = String(opts.site_timezone || 'Asia/Shanghai').trim() || 'Asia/Shanghai';
  const channelTitle = String(opts.site_title || 'Utterlog').trim() || 'Utterlog';
  const channelDescription = String(opts.site_description || opts.seo_default_description || channelTitle).trim();
  const permalink = opts.permalink_structure || '/posts/%postname%';
  const feedUrl = `${site}/feed`;
  const now = new Date();
  const lastBuildDate = formatRfc822InTimeZone(now, timeZone);
  const feedAuthor = String(posts.find((post) => String(post.author_name || '').trim())?.author_name || '').trim() || channelTitle;
  const items = posts.map((post) => {
    const path = buildPostPath(post, permalink, timeZone);
    const link = `${site}${path}`;
    const guid = `${site}/?p=${post.id}`;
    const publishedAt = parsePostPublishedDate(post, timeZone);
    const itemAuthor = String(post.author_name || '').trim() || feedAuthor;
    return [
      '  <item>',
      `    <title>${cdata(String(post.title || ''))}</title>`,
      `    <link>${xmlEscape(link)}</link>`,
      `    <guid isPermaLink="false">${xmlEscape(guid)}</guid>`,
      `    <pubDate>${formatRssPubDate(post, timeZone)}</pubDate>`,
      `    <dc:date>${formatIso8601InTimeZone(publishedAt, timeZone)}</dc:date>`,
      `    <dc:creator>${cdata(itemAuthor)}</dc:creator>`,
      `    <description>${cdata(feedSummaryText(post))}</description>`,
      '  </item>',
    ].join('\n');
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${xmlEscape(channelTitle)}</title>
<link>${xmlEscape(site)}</link>
<description>${xmlEscape(channelDescription)}</description>
<language>zh-CN</language>
<dc:creator>${cdata(feedAuthor)}</dc:creator>
<lastBuildDate>${lastBuildDate}</lastBuildDate>
<ttl>60</ttl>
<atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`;
}

// feed 的浏览器形态：标题 / 作者 / 发布时间 / 摘要 的主题风格预览页。
// 深色为默认观感（与 ShanYing 线上呈现一致），浅色跟随系统偏好；
// 设计令牌（bg/surface/line/accent/radius）取自主题 styles.css。
function buildFeedHtmlPage(opts: Record<string, string>, posts: Record<string, unknown>[]) {
  const site = siteOrigin(opts);
  const timeZone = String(opts.site_timezone || 'Asia/Shanghai').trim() || 'Asia/Shanghai';
  const channelTitle = String(opts.site_title || 'Utterlog').trim() || 'Utterlog';
  const channelDescription = String(opts.site_description || opts.seo_default_description || channelTitle).trim();
  const feedAuthor = String(posts.find((post) => String(post.author_name || '').trim())?.author_name || '').trim() || channelTitle;
  const permalink = opts.permalink_structure || '/posts/%postname%';
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
  });
  const items = posts.map((post) => {
    const link = `${site}${buildPostPath(post, permalink, timeZone)}`;
    const date = parsePostPublishedDate(post, timeZone);
    const author = String(post.author_name || '').trim() || feedAuthor;
    return `    <article class="entry">
      <h2><a href="${xmlEscape(link)}">${xmlEscape(String(post.title || ''))}</a></h2>
      <div class="meta">
        <span>作者 <strong>${xmlEscape(author)}</strong></span>
        <span class="dot"></span>
        <time>${xmlEscape(date ? dateFormatter.format(date) : '')}</time>
      </div>
      <p class="summary">${xmlEscape(feedSummaryText(post))}</p>
    </article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${xmlEscape(channelTitle)} · RSS 订阅</title>
<style>
:root {
  --bg: #0a0a0a; --text: #eeeeee; --muted: #a3a3a3;
  --surface: #191919; --soft: #242424;
  --line: rgba(255, 255, 255, 0.09);
  --accent: #90ff3a; --accent-text: #0a0a0a;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #faf9f7; --text: #202126; --muted: #676b76;
    --surface: #ffffff; --soft: #f1f2f5;
    --line: rgba(25, 28, 40, 0.1);
    --accent: #0052d9; --accent-text: #ffffff;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 760px; margin: 0 auto; padding: 48px 20px 64px; }
.hero {
  text-align: center;
  padding: 34px 26px 30px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--surface);
}
.badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.22em;
  color: var(--accent-text); background: var(--accent);
}
h1 { margin: 16px 0 8px; font-size: 27px; }
.lede { margin: 0; font-size: 13px; line-height: 1.8; color: var(--muted); }
.hero-meta {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 10px;
  margin-top: 16px; font-size: 12px; color: var(--muted);
}
.hero-meta .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--muted); }
.hero-meta strong { color: var(--accent); font-weight: 700; }
.hero-meta a { color: var(--muted); text-decoration: none; border-bottom: 1px solid var(--line); }
.hero-meta a:hover { color: var(--accent); }
.entries { margin-top: 24px; }
.entry {
  padding: 19px 22px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.entry + .entry { margin-top: 12px; }
.entry:hover { border-color: var(--accent); transform: translateY(-1px); }
.entry h2 { margin: 0; font-size: 15.5px; font-weight: 600; line-height: 1.55; }
.entry h2 a { color: var(--text); text-decoration: none; }
.entry h2 a:hover { color: var(--accent); }
.meta {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: 10px; margin-top: 9px; font-size: 12px; color: var(--muted);
}
.meta .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--muted); }
.meta strong { color: var(--text); font-weight: 600; }
.summary {
  margin: 10px 0 0;
  font-size: 13px; line-height: 1.8; color: var(--muted);
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
}
footer { margin-top: 30px; text-align: center; font-size: 12px; line-height: 2; color: var(--muted); }
footer a { color: var(--accent); text-decoration: none; }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <span class="badge">RSS</span>
    <h1>${xmlEscape(channelTitle)}</h1>
    <p class="lede">${xmlEscape(channelDescription)}</p>
    <div class="hero-meta">
      <span>作者 <strong>${xmlEscape(feedAuthor)}</strong></span>
      <span class="dot"></span>
      <span>收录 <strong>${posts.length}</strong> 篇</span>
      <span class="dot"></span>
      <a href="${xmlEscape(site)}">访问网站 →</a>
    </div>
  </header>
  <main class="entries">
${items}
  </main>
  <footer>
    <p>把本页地址粘贴到 RSS 阅读器（Feedly / Follow / Reeder 等），即可自动收到本站更新。</p>
    <a href="${xmlEscape(site)}">← 返回 ${xmlEscape(channelTitle)}</a>
  </footer>
</div>
</body>
</html>`;
}

export async function publicFeedResponse(request: Request) {
  const opts: Record<string, string> = await optionMap(false).catch(() => ({}));
  const posts = await loadPublishedPostsForFeed(rssItemLimit(opts));
  // 同一个地址两种形态：浏览器直接打开（Accept 含 text/html）时返回
  // 主题风格的预览页；RSS 阅读器与脚本按 Accept 拿到 XML 本体。
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    return new Response(buildFeedHtmlPage(opts, posts), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300, must-revalidate' },
    });
  }
  const xml = buildRssFeedXml(opts, posts);
  const etag = `"${createHash('sha1').update(xml).digest('hex')}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { etag, 'cache-control': 'public, max-age=300, must-revalidate' } });
  }
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8',
    'cache-control': 'public, max-age=300, must-revalidate', etag } });
}

function buildPostPath(
  post: { id?: unknown; display_id?: unknown; slug?: unknown; category_slug?: unknown; published_at?: unknown; created_at?: unknown },
  template = '',
  timeZone = 'UTC',
) {
  const tpl = template.trim() || '/posts/%postname%';
  const parts = postDateParts(post, timeZone);
  const category = encodeURIComponent(String(post.category_slug || 'uncategorized'));
  const path = tpl
    .replace(/%postname%/g, encodeURIComponent(String(post.slug || post.id || '')))
    .replace(/%post_id%/g, String(post.id || ''))
    .replace(/%display_id%/g, String(post.display_id || post.id || ''))
    .replace(/%year%/g, parts.year)
    .replace(/%month%/g, parts.month)
    .replace(/%day%/g, parts.day)
    .replace(/%category%/g, category);
  return path.startsWith('/') ? path : `/${path}`;
}

const aiBotUserAgents = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Bytespider',
  'FacebookBot',
  'Meta-ExternalAgent',
  'Applebot-Extended',
  'DuckAssistBot',
  'Diffbot',
];

export async function robotsTxtResponse() {
  const opts: Record<string, string> = await optionMap(false).catch(() => ({}));
  const site = siteOrigin(opts);
  const aiAllowed = boolOptionValue(opts.ai_crawl_allowed, true);
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /admin/', 'Disallow: /api/', ''];
  for (const agent of aiBotUserAgents) {
    lines.push(`User-agent: ${agent}`, `${aiAllowed ? 'Allow' : 'Disallow'}: /`, '');
  }
  if (site) {
    lines.push(`Sitemap: ${site}/sitemap.xml`);
    if (boolOptionValue(opts.llms_txt_enabled, true)) lines.push(`# llms.txt available at ${site}/llms.txt`);
  }
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

export async function sitemapXmlResponse() {
  const opts: Record<string, string> = await optionMap(false).catch(() => ({}));
  const site = siteOrigin(opts);
  const headers = { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' };
  if (!site) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', { headers });
  }
  const now = new Date().toISOString();
  const items: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
    { loc: `${site}/`, lastmod: now, changefreq: 'daily', priority: '1.0' },
  ];
  for (const path of ['/about', '/archives', '/films', '/moments', '/guestbook', '/footprints', '/coding', '/links', '/albums', '/music', '/books', '/games', '/movies', '/goods', '/feeds']) {
    if (path === '/guestbook' && opts.page_guestbook === 'false') continue;
    items.push({ loc: `${site}${path}`, lastmod: now, changefreq: 'weekly', priority: '0.6' });
  }
  const posts = await many<Record<string, unknown>>(
    `select p.id, p.slug, p.display_id, p.type, p.created_at, p.updated_at, p.published_at,
            coalesce((
              select m.slug from ${table('relationships')} r
              join ${table('metas')} m on m.id = r.meta_id and m.type = 'category'
              where r.post_id = p.id order by m.id asc limit 1
            ), '') as category_slug
     from ${table('posts')} p
     where p.status = 'publish' and p.type <> 'guestbook'
     order by coalesce(p.published_at, to_timestamp(p.created_at)) desc
     limit 5000`,
  ).catch(() => []);
  const permalink = opts.permalink_structure || '/posts/%postname%';
  for (const post of posts) {
    const path = String(post.type || '') === 'video'
      ? `/films/${encodeURIComponent(String(post.slug || post.display_id || post.id || ''))}`
      : buildPostPath(post, permalink);
    items.push({
      loc: `${site}${path}`,
      lastmod: postDateParts({ published_at: post.updated_at || post.published_at || post.created_at }).iso,
      changefreq: 'monthly',
      priority: '0.8',
    });
  }
  const metas = await many<Record<string, unknown>>(
    `select slug, type, updated_at, created_at
     from ${table('metas')}
     where type in ('category','tag') and coalesce(slug,'') <> ''`,
  ).catch(() => []);
  for (const meta of metas) {
    const base = meta.type === 'category' ? '/categories/' : '/tags/';
    items.push({
      loc: `${site}${base}${encodeURIComponent(String(meta.slug || ''))}`,
      lastmod: postDateParts({ published_at: meta.updated_at || meta.created_at }).iso,
      changefreq: 'weekly',
      priority: meta.type === 'category' ? '0.5' : '0.4',
    });
  }
  const urls = items.map((item) => (
    `  <url><loc>${xmlEscape(item.loc)}</loc><lastmod>${item.lastmod}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`
  )).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, { headers });
}

export async function llmsTxtResponse() {
  const opts: Record<string, string> = await optionMap(false).catch(() => ({}));
  if (!boolOptionValue(opts.llms_txt_enabled, true)) {
    return new Response('llms.txt is disabled in this site SEO settings', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const site = siteOrigin(opts);
  const title = String(opts.site_title || 'Utterlog').trim() || 'Utterlog';
  const tagline = String(opts.seo_default_description || opts.site_description || '').trim();
  const posts = await many<{ title: string; slug: string; excerpt: string; created_at: number }>(
    `select title, slug, coalesce(excerpt,'') as excerpt, created_at
     from ${table('posts')}
     where status = 'publish' and type = 'post'
     order by coalesce(published_at, to_timestamp(created_at)) desc
     limit 200`,
  ).catch(() => []);
  const lines = [`# ${title}`, ''];
  if (tagline) lines.push(`> ${oneLine(tagline)}`, '');
  if (site) lines.push(`Site: ${site}`, '');
  if (posts.length) {
    lines.push('## Posts', '');
    for (const post of posts) {
      const url = `${site || ''}/posts/${encodeURIComponent(post.slug || '')}`;
      const summary = oneLine(post.excerpt || post.title || '');
      lines.push(summary && summary !== post.title ? `- [${post.title}](${url}): ${summary}` : `- [${post.title}](${url})`);
    }
  }
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

export async function llmsFullTxtResponse() {
  const opts: Record<string, string> = await optionMap(false).catch(() => ({}));
  if (String(opts.llms_full_enabled || '').trim().toLowerCase() !== 'true') {
    return new Response('llms-full.txt is disabled in this site SEO settings', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const site = siteOrigin(opts);
  const title = String(opts.site_title || 'Utterlog').trim() || 'Utterlog';
  const tagline = String(opts.seo_default_description || opts.site_description || '').trim();
  const posts = await many<{ title: string; slug: string; excerpt: string; content: string; published_at: unknown; created_at: unknown }>(
    `select title, slug, excerpt, content, published_at, created_at
     from ${table('posts')}
     where status = 'publish' and type = 'post'
     order by coalesce(published_at, to_timestamp(created_at)) desc
     limit 500`,
  ).catch(() => []);
  const body = posts.map((post) => {
    const url = `${site}/${encodeURIComponent(String(post.slug || ''))}`;
    const excerpt = String(post.excerpt || '').trim();
    return [
      `## ${post.title}`,
      `URL: ${url}`,
      `Published: ${postDateParts(post).iso}`,
      excerpt ? `Summary: ${excerpt}` : '',
      String(post.content || '').trim(),
    ].filter(Boolean).join('\n');
  }).join('\n\n---\n\n');
  const header = [`# ${title}`, tagline ? `\n> ${oneLine(tagline)}\n` : '', site ? `\nSite: ${site}\nGenerated: ${new Date().toISOString()}\n` : ''].join('');
  return new Response(`${header}\n${body}\n`, {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
