/**
 * 站点域名归一化与友链匹配。
 *
 * 用途：评论者填的网址跟友链库比对，命中就在评论上打「友链好友」标记。
 * 前后台共用，所以放 shared —— 后台的匹配预览和前台的徽章必须是同一套规则，
 * 否则后台看着能匹配、前台却不显示。
 */

/**
 * 域名后缀表。注册域 = 后缀 + 往前一级。
 *
 * 两类东西混在一起，因为对匹配来说它们的作用完全一样：
 *   1. 多级国家域（com.cn、co.uk）—— 不列出来的话 `x.example.com.cn` 会被
 *      算成注册域 `com.cn`，那全中国的 .com.cn 站点就互相匹配了。
 *   2. 托管平台（github.io、vercel.app）—— 每个子域是独立站点。列进来之后
 *      `a.github.io` 的注册域就等于它自己，跨站兜底自然失效，不用额外判断。
 *
 * 只需要覆盖友链里可能出现的，不追求 PSL 那种完备性 —— 漏一条的后果是
 * 那个域名退化成精确匹配，不会误伤别人。
 */
const DOMAIN_SUFFIXES = new Set([
  // 多级国家域
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'com.hk', 'com.tw', 'com.mo', 'com.sg', 'com.my',
  'co.uk', 'org.uk', 'me.uk', 'com.au', 'net.au', 'org.au',
  'co.jp', 'ne.jp', 'or.jp', 'co.kr', 'co.nz', 'co.in',
  'com.br', 'com.mx', 'com.ar', 'com.tr', 'com.ua', 'co.za',
  // 静态托管 / 博客平台：子域即独立站点
  'github.io', 'gitlab.io', 'gitee.io', 'js.org',
  'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'web.app',
  'firebaseapp.com', 'appspot.com', 'herokuapp.com', 'surge.sh',
  'glitch.me', 'render.com', 'fly.dev', 'deno.dev', 'notion.site',
  'wordpress.com', 'blogspot.com', 'tumblr.com', 'substack.com',
  'cnblogs.com', 'csdn.net', 'jianshu.com', 'zhihu.com', 'segmentfault.com',
  'bearblog.dev', 'micro.blog', 'hashnode.dev', 'gitbook.io',
]);

/** 从任意写法的网址里取出小写、去 www 的主机名。取不到返回空串。 */
export function normalizeSiteHost(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  let host = '';
  try {
    host = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? new URL(raw).hostname
      : new URL(`http://${raw.replace(/^\/\//, '')}`).hostname;
  } catch {
    // URL 解析不了就退回到裸字符串切分，容忍用户手填的 `example.com/blog` 这种
    host = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^\/\//, '').split('/')[0].split('?')[0];
  }
  host = host.toLowerCase().replace(/\.+$/, '').split(':')[0];
  if (!host || !host.includes('.')) return '';
  return host.replace(/^www\./, '');
}

/**
 * 注册域：`blog.example.com` → `example.com`。
 *
 * 命中 DOMAIN_SUFFIXES 时后缀本身算两级以上，`x.example.com.cn` → `example.com.cn`。
 * 托管平台域下结果等于主机名本身，调用方据此判断「没有可兜底的上级域」。
 */
export function registrableHost(host: string): string {
  const parts = String(host || '').split('.').filter(Boolean);
  if (parts.length < 2) return '';
  // 表里的后缀都是两段（com.cn / github.io），命中时注册域要多带一级
  if (parts.length >= 3 && DOMAIN_SUFFIXES.has(parts.slice(-2).join('.'))) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * 一个网址参与匹配的键：精确主机名，加上可用的注册域。
 * 注册域跟主机名相同时（托管平台、或本来就是二级域）只返回一个。
 */
export function siteMatchKeys(input: string): string[] {
  const host = normalizeSiteHost(input);
  if (!host) return [];
  const registrable = registrableHost(host);
  return registrable && registrable !== host ? [host, registrable] : [host];
}

/**
 * 建索引。冲突处理是这里的关键：
 *
 * - 精确主机名重复 —— 后一条不覆盖前一条（友链表里本来就不该有重复域名）。
 * - 注册域重复 —— 直接把这个键作废。`blog.x.com` 和 `shop.x.com` 是两条不同友链，
 *   评论者填 `x.com` 时无法判断是哪一个，宁可不标也不能标错人。
 * - 注册域跟别人的精确主机名撞车 —— 精确的赢，因为它更确定。
 */
export function buildSiteIndex<T>(items: readonly T[], getUrl: (item: T) => string): Map<string, T> {
  const exact = new Map<string, T>();
  const loose = new Map<string, T>();
  const ambiguous = new Set<string>();
  for (const item of items) {
    const host = normalizeSiteHost(getUrl(item));
    if (!host) continue;
    if (!exact.has(host)) exact.set(host, item);
    const registrable = registrableHost(host);
    if (!registrable || registrable === host) continue;
    if (loose.has(registrable) && loose.get(registrable) !== item) ambiguous.add(registrable);
    else loose.set(registrable, item);
  }
  const index = new Map(exact);
  for (const [key, item] of loose) {
    if (ambiguous.has(key) || index.has(key)) continue;
    index.set(key, item);
  }
  return index;
}

/** 用评论者填的网址去索引里找友链。先精确后注册域。 */
export function matchSiteIndex<T>(url: string, index: Map<string, T>): T | undefined {
  for (const key of siteMatchKeys(url)) {
    const hit = index.get(key);
    if (hit !== undefined) return hit;
  }
  return undefined;
}
