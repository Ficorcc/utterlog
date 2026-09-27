'use client';

/**
 * ShanYing · 共享工具层
 *
 * 从 WordPress 主题「山映 · ShanYing」（作者：西风）移植。
 * 这里只放跨组件复用的东西：深浅配色状态机、图标映射、日期/摘要格式化、
 * 以及两套热力图。所有 class 名统一带 `sy-` 前缀。
 *
 * 深色模式不能用 `data-theme`（已被主题名占用），改用 `data-shanying-mode`；
 * 并且必须留 `prefers-color-scheme` 兜底，否则首屏会闪浅色。
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { datePartsInTimeZone, isValidTimeZone } from '@/lib/timezone';
import { postDateInput } from '@/lib/post-date';

export type ShanYingMode = 'light' | 'dark' | 'system';

export const SHANYING_MODE_KEY = 'shanying-mode';
export const SHANYING_MODE_ATTR = 'shanyingMode';

export function applyShanYingMode(mode: ShanYingMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset[SHANYING_MODE_ATTR];
  else root.dataset[SHANYING_MODE_ATTR] = mode;
}

/** 读写本地深浅偏好；system 表示跟随操作系统。 */
export function useShanYingMode() {
  const [mode, setModeState] = useState<ShanYingMode>('system');

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(SHANYING_MODE_KEY);
    } catch {
      saved = null;
    }
    const next: ShanYingMode = saved === 'light' || saved === 'dark' ? saved : 'system';
    setModeState(next);
    applyShanYingMode(next);
  }, []);

  const setMode = useCallback((next: ShanYingMode) => {
    setModeState(next);
    applyShanYingMode(next);
    try {
      window.localStorage.setItem(SHANYING_MODE_KEY, next);
    } catch {
      /* 隐私模式下 localStorage 可能抛错，忽略即可 */
    }
  }, []);

  return { mode, setMode };
}

export function cycleMode(mode: ShanYingMode): ShanYingMode {
  if (mode === 'system') return 'light';
  if (mode === 'light') return 'dark';
  return 'system';
}

export function modeLabel(mode: ShanYingMode) {
  return mode === 'system' ? '跟随系统' : mode === 'light' ? '浅色' : '深色';
}

/** 当前是否处于深色（system 时读系统偏好）。 */
export function resolveDark(mode: ShanYingMode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

/* ── 图标 ─────────────────────────────────────────────────────────
 * 原主题用一套自绘 24px 描边 SVG（feng_icon）。Utterlog 全站已加载
 * FontAwesome 7.3.1，这里统一映射到 FA，保证与导航 / 评论等共享组件同一套
 * 图标语言，也避免往主题包里塞一堆零散 SVG。
 */
const REGULAR: Record<string, string> = {
  code: 'code',
  folder: 'folder',
  globe: 'globe',
  refresh: 'arrows-rotate',
  copy: 'copy',
  search: 'magnifying-glass',
  moon: 'moon',
  sun: 'sun',
  'arrow-up-right': 'arrow-up-right',
  'arrow-down': 'arrow-down',
  'arrow-up': 'arrow-up',
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  'chevron-down': 'chevron-down',
  previous: 'chevron-left',
  next: 'chevron-right',
  pause: 'pause',
  play: 'play',
  check: 'check',
  sparkle: 'sparkles',
  close: 'xmark',
  plus: 'plus',
  hash: 'hashtag',
  pin: 'location-dot',
  image: 'image',
  edit: 'pen-to-square',
  calendar: 'calendar-days',
  heat: 'fire',
  words: 'file-lines',
  reading: 'book-open',
  print: 'print',
  clock: 'clock',
  share: 'share-nodes',
  comment: 'comment',
  person: 'user',
  email: 'envelope',
  rss: 'rss',
  link: 'link',
  music: 'music',
  playlist: 'list-music',
  list: 'list-ul',
  grid: 'table-cells-large',
  'square-up': 'square-up',
};

const BRANDS: Record<string, string> = {
  wordpress: 'wordpress',
  github: 'github',
  bilibili: 'bilibili',
  weibo: 'weibo',
  telegram: 'telegram',
  wechat: 'weixin',
  x: 'x-twitter',
  twitter: 'x-twitter',
  rss: 'square-rss',
};

/** 单色描边图标（默认 regular，可用 solid 覆盖）。 */
export function Icon({
  name,
  solid = false,
  className = '',
  brand = false,
}: {
  name: string;
  solid?: boolean;
  className?: string;
  brand?: boolean;
}) {
  const cls = brand || BRANDS[name] ? `fa-brands fa-${BRANDS[name] || name}` : `fa-${solid ? 'solid' : 'regular'} fa-${REGULAR[name] || name}`;
  return <i className={`sy-icon ${cls}${className ? ` ${className}` : ''}`} aria-hidden="true" />;
}

/** 分类图标：后台可填 FA 类名 / 图片 URL / 内联 SVG，否则回落文件夹。 */
export function renderCatIcon(icon: string | undefined, size = 18): ReactNode {
  if (icon && icon.trim().startsWith('<svg')) {
    return (
      <span
        className="sy-cat-icon"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: icon.replace(/<svg/, `<svg width="${size}" height="${size}"`) }}
      />
    );
  }
  if (icon && (icon.startsWith('http') || icon.startsWith('/'))) {
    return <img className="sy-cat-icon" src={icon} alt="" style={{ width: size, height: size }} />;
  }
  if (icon && /^fa[a-z-]*\s/.test(icon)) return <i className={`${icon} sy-cat-icon`} style={{ fontSize: size }} aria-hidden="true" />;
  return <i className="fa-regular fa-folder sy-cat-icon" style={{ fontSize: size }} aria-hidden="true" />;
}

/** 文章封面兜底图标。 */
export function catIconClass(cat?: { icon?: string } | null) {
  const icon = cat?.icon;
  if (icon && /^fa[a-z-]*\s/.test(icon)) return icon;
  return 'fa-regular fa-file-lines';
}

/* ── 文本 / 日期 ───────────────────────────────────────────────── */

export function plainText(value?: string | null) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerptOf(post: any, max = 42) {
  const text = plainText(post?.excerpt || post?.ai_summary || post?.content);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function relativeTime(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '';
  const ms = typeof value === 'number'
    ? (value < 1e12 ? value * 1000 : value)
    : new Date(String(value)).getTime();
  if (!Number.isFinite(ms)) return '';
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 个月前`;
  return `${Math.floor(diff / 31536000)} 年前`;
}

export function hourNow() {
  return new Date().getHours();
}

/**
 * 站点时区下的整点小时数。
 *
 * Hero 的问候语和山景场景都跟着它变。必须用站点时区（而不是访客本地时间）
 * 才算得出服务端与客户端一致的值 —— 否则 SSR 渲染「早上好」、hydration
 * 变成「天黑了」，React 会直接报 hydration mismatch。
 */
export function hourInTimeZone(timeZone?: string | null, fallback = 12) {
  if (!isValidTimeZone(timeZone || '')) return hourNow();
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone as string,
      hour: '2-digit',
      hour12: false,
    }).format(new Date());
    const hour = Number(formatted);
    return Number.isFinite(hour) ? hour % 24 : fallback;
  } catch {
    return fallback;
  }
}

/** 山映首页/页脚的「跟随时间」一句问候。 */
export function greetingOf(siteTitle: string, hour = hourNow()) {
  const who = siteTitle || '朋友';
  if (hour < 5) return `${who}，夜深了，欢迎回来。`;
  if (hour < 9) return `${who}，早上好，欢迎回来。`;
  if (hour < 12) return `${who}，上午好，欢迎回来。`;
  if (hour < 14) return `${who}，中午好，欢迎回来。`;
  if (hour < 18) return `${who}，下午好，欢迎回来。`;
  return `${who}，天黑了，欢迎回来。`;
}

/* ── 热力图 ─────────────────────────────────────────────────────
 * 两套：ArchivePage 用整年 GitHub 风（53 周），HomePage 用近 90 天。
 */

interface HeatCell {
  date: string;
  count: number;
}

function buildYearWeeks(data: HeatCell[], timeZone: string) {
  const tz = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const ymd = (d: Date) => {
    const t = datePartsInTimeZone(d, tz);
    return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
  };
  const todayYmd = ymd(new Date());
  const today = new Date(`${todayYmd}T00:00:00Z`);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 364);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const counts = new Map<string, number>();
  for (const item of data) counts.set(item.date, item.count);

  const weeks: { dateStr: string; count: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  while (cursor <= today || weeks.length < 53) {
    const week: { dateStr: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d += 1) {
      const t = datePartsInTimeZone(cursor, 'UTC');
      const dateStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
      week.push({ dateStr, count: counts.get(dateStr) || 0, future: cursor > today });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    if (cursor > today && weeks.length >= 53) break;
  }
  return { weeks, today };
}

/** 整年热力图（归档页）。 */
export function ShanYingYearHeatmap({
  data,
  timeZone,
  hint = '颜色越深表示当天发布越多',
}: {
  data: HeatCell[];
  timeZone: string;
  hint?: string;
}) {
  const { weeks } = buildYearWeeks(data, timeZone);
  const labels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const day = new Date(`${week[0].dateStr}T00:00:00Z`);
    const month = day.getUTCMonth();
    if (month !== lastMonth) {
      labels.push({ label: `${month + 1}月`, col: index });
      lastMonth = month;
    }
  });

  return (
    <div className="sy-heatmap">
      <div className="sy-heatmap-months">
        {weeks.map((_, i) => {
          const found = labels.find((l) => l.col === i);
          return <span key={i}>{found ? found.label : ''}</span>;
        })}
      </div>
      <div className="sy-heatmap-grid">
        {weeks.map((week, wi) => (
          <div className="sy-heatmap-week" key={wi}>
            {week.map((day, di) => (
              <i
                key={di}
                data-level={day.future ? '' : Math.min(4, day.count)}
                data-future={day.future ? '1' : undefined}
                title={day.future ? '' : `${day.dateStr}：${day.count} 篇`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="sy-heatmap-legend">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} data-level={level} />
        ))}
        <span>多</span>
        <em>{hint}</em>
      </div>
    </div>
  );
}

/** 近 90 天热力图（首页 Hero 用，3 行 × 30 列）。 */
export function ShanYingRecentHeatmap({ data, days = 90 }: { data: HeatCell[]; days?: number }) {
  const counts = new Map<string, number>();
  for (const item of data) counts.set(item.date, item.count);

  const cells: HeatCell[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    cells.push({ date: key, count: counts.get(key) || 0 });
  }

  return (
    <div className="sy-heatmap-mini" role="img" aria-label={`近 ${days} 天发布记录`}>
      {cells.map((cell) => (
        <button
          key={cell.date}
          type="button"
          title={`${cell.date}：${cell.count} 篇`}
          aria-label={`${cell.date}：${cell.count} 篇`}
          data-level={Math.min(4, cell.count)}
        />
      ))}
    </div>
  );
}

/* ── 滚动进入 ─────────────────────────────────────────────────────
 * 原主题靠 `[data-xf-reveal][data-xf-pending]` 做「进入视口才浮现」。
 * 这里用 IntersectionObserver 在客户端加 pending；SSR 出来的 HTML 不带
 * pending，所以没有 JS 时内容依然完整可见。
 */

export function useReveal<T extends HTMLElement>(rootMargin = '-6% 0px -8% 0px') {
  const ref = useRef<T | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const box = el.getBoundingClientRect();
    // 首屏范围内的元素不参与动画，避免刚进页面就抖一下
    if (box.top < window.innerHeight * 0.92) return;
    setPending(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPending(false);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, pending };
}

export { postDateInput };

/* ── 封面取色 ─────────────────────────────────────────────────────
 * 原主题的卡片会用封面图的主色做标题区底色（服务端采样）。
 * Utterlog 没有这个接口，这里退化成两层：
 *   1. 站点自有图片（同源 /uploads、/themes、相对路径）→ 用 canvas 本地采样；
 *   2. 其余（跨域随机图 API）→ 用主题默认墨色 #1a2428。
 * 同源判定很关键：跨域图直接画进 canvas 会污染画布，getImageData 会抛错；
 * 强行给 <img> 加 crossOrigin 反而会让图本身加载失败。
 */

export const SHANYING_CARD_TONE = '#1a2428';

export function isSameOriginImage(url?: string | null) {
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  if (url.startsWith('/')) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function useCoverTone(url?: string | null) {
  const [tone, setTone] = useState<string>('');

  useEffect(() => {
    if (!url || !isSameOriginImage(url)) {
      setTone('');
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (cancelled) return;
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] / 255 < 0.5) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n += 1;
        }
        if (!n) return;
        r = Math.round(r / n);
        g = Math.round(g / n);
        b = Math.round(b / n);
        // 压暗、压饱和，让压在标题上的白字始终读得清
        const mix = (channel: number) => Math.round(channel * 0.42 + 26 * 0.58);
        setTone(`rgb(${mix(r)} ${mix(g)} ${mix(b)})`);
      } catch {
        setTone('');
      }
    };
    image.onerror = () => {
      if (!cancelled) setTone('');
    };
    image.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return tone || SHANYING_CARD_TONE;
}
