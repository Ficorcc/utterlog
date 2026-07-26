import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { normalizeSiteHost } from '@shared/link-match';
import { config, table } from '../config';
import { icoToPng, isIco } from '../media/ico-decode';
import { exec, many, nowUnix } from '../db/helpers';
import { assertPublicHttpUrl } from '../http/public-url';
import { invalidateFriendLinks } from './friend-links';

/**
 * 把友链的站点图标抓回来存在本地，减少对外部 favicon 服务的实时依赖。
 *
 * 抓不到的仍旧交给前台回落到 favicon 服务 —— 这套只是把常用的那部分变成
 * 自己的静态文件，不是要取代兜底。
 *
 * 抓取的是**用户填进来的任意 URL**，所以每一次外部请求都必须过
 * `assertPublicHttpUrl`（含 DNS 解析后的内网校验）。跟着 HTML 里的
 * <link rel=icon> 跳到第二个地址时也要重新校验：首页在公网、图标地址指向
 * 127.0.0.1 是最典型的 SSRF 绕过写法。
 */

const ICON_DIR = 'link-icons';
const ICON_SIZE = 64;
/** favicon 不该有这么大。超过直接放弃，免得一个坏站点吃满内存。 */
const MAX_ICON_BYTES = 512 * 1024;
const MAX_HTML_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8000;
/** 同时抓几个站。友链是几十条量级，6 路够快又不至于把出口打满。 */
const CONCURRENCY = 6;

export type IconFetchResult = {
  linkId: number;
  name: string;
  url: string;
  ok: boolean;
  iconUrl?: string;
  /** 失败原因，直接展示给后台，用来判断是对方站点的问题还是我们的问题。 */
  error?: string;
};

/** 跳转最多跟几次。够用了，正常站点不会绕这么多圈。 */
const MAX_REDIRECTS = 3;

/**
 * 带超时、大小上限、逐跳内网校验的抓取。
 *
 * `redirect: 'manual'` 是这里的关键：交给 fetch 自动跟随的话，一个公网地址
 * 302 到 127.0.0.1 就绕过了入口处的校验 —— 这是最常见的 SSRF 写法。每一跳
 * 都重新过 assertPublicHttpUrl，才算真的挡住。
 */
async function fetchWithLimit(url: string, maxBytes: number, accept: string) {
  let current = await assertPublicHttpUrl(url);
  let response: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(current, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'manual',
      headers: {
        accept,
        // 有些站点对空 UA 直接 403
        'user-agent': 'Mozilla/5.0 (compatible; UtterlogBot/1.0; +https://utterlog.com/bot)',
      },
    });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get('location');
    if (!location) break;
    if (hop === MAX_REDIRECTS) throw new Error('跳转次数过多');
    // 相对地址要基于当前这一跳解析，再重新做一次内网校验
    current = await assertPublicHttpUrl(new URL(location, current).toString());
  }
  if (!response) throw new Error('请求失败');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('文件过大');
  const bytes = Buffer.from(await response.arrayBuffer());
  // content-length 可以撒谎或者干脆没有，拿到实际字节后再卡一次
  if (bytes.length > maxBytes) throw new Error('文件过大');
  if (bytes.length === 0) throw new Error('响应为空');
  return { bytes, contentType: response.headers.get('content-type') || '', finalUrl: current };
}

/**
 * 从 HTML 里挑图标地址，按尺寸从大到小。
 *
 * 只认 link 标签的 rel，不做完整 HTML 解析 —— 目标是拿一个 URL，正则足够，
 * 引不进一个 DOM 库。
 */
export function extractIconCandidates(html: string, baseUrl: string): string[] {
  const candidates: { href: string; score: number }[] = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase() || '';
    if (!/\b(icon|apple-touch-icon|apple-touch-icon-precomposed|shortcut icon)\b/.test(rel)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)/i.exec(tag)?.[1]?.trim();
    if (!href || href.startsWith('data:')) continue;
    // sizes="180x180" 里取宽度当分数；apple-touch-icon 通常比 favicon 清晰，给个底分
    const sizes = /\bsizes\s*=\s*["']?(\d+)x/i.exec(tag)?.[1];
    const score = Number(sizes) || (rel.includes('apple') ? 180 : 32);
    try {
      candidates.push({ href: new URL(href, baseUrl).toString(), score });
    } catch {
      // 拼不出绝对地址就跳过这一个
    }
  }
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .map((item) => item.href)
    .filter((href) => !seen.has(href) && seen.add(href));
}

/** 抓一个站点的图标并转成 WebP。全部失败时返回 null。 */
async function fetchSiteIcon(siteUrl: string): Promise<Buffer | null> {
  const targets: string[] = [];
  try {
    const page = await fetchWithLimit(siteUrl, MAX_HTML_BYTES, 'text/html,application/xhtml+xml');
    if (page.contentType.includes('html')) {
      targets.push(...extractIconCandidates(page.bytes.toString('utf8'), page.finalUrl));
    }
  } catch {
    // 首页拿不到不代表没有 favicon.ico，继续往下试
  }
  try {
    targets.push(new URL('/favicon.ico', siteUrl).toString());
  } catch {
    // siteUrl 本身就不是合法地址，下面的循环会空转然后返回 null
  }

  for (const target of targets.slice(0, 4)) {
    try {
      const icon = await fetchWithLimit(target, MAX_ICON_BYTES, 'image/*');
      // 有的站点 404 页面返回 200 + HTML，扔进 sharp 只会报错，先按类型挡一道
      if (icon.contentType && !/image|octet-stream/i.test(icon.contentType)) continue;
      // sharp 不认 ICO，得先把里面最大的那张剥出来 —— /favicon.ico 是最主要的
      // 回退路径，不解这一层等于这条路径全废
      const decoded = isIco(icon.bytes) ? await icoToPng(icon.bytes) : icon.bytes;
      if (!decoded) continue;
      const webp = await sharp(decoded, { animated: false, failOn: 'error', limitInputPixels: 40_000_000 })
        .resize({ width: ICON_SIZE, height: ICON_SIZE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90, effort: 4 })
        .toBuffer();
      if (webp.length > 0) return webp;
    } catch {
      // 这一个不行就试下一个
    }
  }
  return null;
}

/** 文件名只用归一化过的主机名，天然不含路径分隔符，也让同一站点复用同一个文件。 */
function iconFilename(siteUrl: string): string {
  const host = normalizeSiteHost(siteUrl);
  if (!host) return '';
  // 归一化后仍是主机名，这里再兜一层，杜绝任何形式的路径穿越
  return `${host.replace(/[^a-z0-9.-]/g, '_')}.webp`;
}

/**
 * 给所有友链抓一遍图标。已经手填了 logo 的跳过 —— 人工设置的不该被覆盖。
 */
export async function refreshLinkIcons(): Promise<{ total: number; ok: number; failed: number; results: IconFetchResult[] }> {
  const rows = await many<{ id: number; name: string; url: string; logo: string }>(
    `select id, name, coalesce(url,'') as url, coalesce(logo,'') as logo
     from ${table('links')} where status = 1 and coalesce(url,'') <> '' order by order_num asc, id asc`,
  ).catch(() => []);

  const targets = rows.filter((row) => !String(row.logo || '').trim());
  const dir = join(config.uploadDir, ICON_DIR);
  mkdirSync(dir, { recursive: true });

  const results: IconFetchResult[] = [];
  const queue = [...targets];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const row = queue.shift();
      if (!row) return;
      const siteUrl = String(row.url || '');
      const base: IconFetchResult = { linkId: Number(row.id), name: String(row.name || ''), url: siteUrl, ok: false };
      const filename = iconFilename(siteUrl);
      if (!filename) {
        results.push({ ...base, error: '网址无法解析出域名' });
        continue;
      }
      try {
        const webp = await fetchSiteIcon(siteUrl);
        if (!webp) {
          results.push({ ...base, error: '未找到可用图标' });
          continue;
        }
        await Bun.write(join(dir, filename), webp);
        const iconUrl = `/uploads/${ICON_DIR}/${filename}`;
        await exec(
          `update ${table('links')} set icon_url = $1, icon_fetched_at = $2 where id = $3`,
          [iconUrl, nowUnix(), row.id],
        );
        results.push({ ...base, ok: true, iconUrl });
      } catch (err) {
        results.push({ ...base, error: err instanceof Error ? err.message : '抓取失败' });
      }
    }
  });
  await Promise.all(workers);

  const ok = results.filter((item) => item.ok).length;
  if (ok > 0) invalidateFriendLinks();
  return {
    total: targets.length,
    ok,
    failed: results.length - ok,
    // 顺序按成功在前，后台列表先看到成果，失败的集中在下面便于排查
    results: results.sort((a, b) => Number(b.ok) - Number(a.ok)),
  };
}
