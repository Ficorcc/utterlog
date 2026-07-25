import type { CSSProperties, ImgHTMLAttributes } from 'react';

const DEFAULT_RANDOM_TEMPLATE = 'https://img.et/800/600?type=landscape&r={id}';

/** 图片效果的默认动画时长，与 globals.css 的 `:root { --img-effect-duration }` 对齐。 */
export const DEFAULT_IMG_EFFECT_DURATION = 500;

/**
 * 选项值来自 API 时是字符串（"true"/"false"），历史默认是 bool true。
 * 空值一律回落到 fallback，其余按「只有明确的否才是关」处理。
 */
function asBool(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no' || s === 'off');
}

export interface ImageEffectOptions {
  image_display_effect?: string;
  image_display_duration?: string | number;
  image_lazy_load?: string | boolean;
  image_lightbox?: string | boolean;
}

/**
 * 把「图片处理」那几个后台选项解析成 <html> 上的属性值。
 *
 * 这份解析同时喂给 SSR（routes/__root.tsx 直接渲染到 <html>）和客户端
 * （ImageEffects.tsx 在选项变化后重写），两边必须得出同一个结果 ——
 * 否则 hydration 时属性一变，CSS 选择器跟着抖一下，图片会闪。
 *
 * 尤其重要的是 `data-img-effect` 必须在 SSR 就写出去：fade 的规则挂在
 * `html[data-img-effect="fade"]` 下，等 useEffect 才补属性的话，首屏
 * 图片会先按无效果渲染（边下边显示），JS 一 hydrate 才突然套上
 * blur(20px)，用户看到的是「图出来了 → 糊掉 → 再清晰」。
 */
export function imageEffectAttrs(options: ImageEffectOptions | undefined) {
  const effect = (options?.image_display_effect || 'fade').toString().trim() || 'fade';
  const parsed = parseInt(String(options?.image_display_duration ?? '').trim(), 10);
  const duration = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_IMG_EFFECT_DURATION;
  return {
    effect,
    duration,
    lazy: asBool(options?.image_lazy_load, true),
    lightbox: asBool(options?.image_lightbox, true),
  };
}

/**
 * Resolve a fallback random-cover URL for a post that has no cover_url.
 *
 * Honours the admin "图片处理 → 随机图片 API" setting:
 *   - random_image_enabled === "false"  → return ""  (callers should
 *     either skip rendering the cover or use a static placeholder).
 *   - random_image_enabled !== "false" → use random_image_api as the
 *     URL template; supports {id}, {w}, {h} placeholders. Empty /
 *     missing template falls back to img.et so existing posts don't
 *     visually regress on first deploy.
 *
 * Pure function — caller passes admin options explicitly so the helper
 * can be used from both client (useThemeContext) and server contexts.
 */
export function randomCoverUrl(
  postId: number | string,
  options?: { random_image_enabled?: string; random_image_api?: string },
): string {
  if (options?.random_image_enabled === 'false') return '';
  let template = options?.random_image_api?.trim() || DEFAULT_RANDOM_TEMPLATE;
  // Make sure each post gets a unique URL so img.et / picsum / etc.
  // serve different covers per post. Three cases handled:
  //   1. Template already has `{id}` placeholder → use as-is.
  //   2. Template has any `r=<value>` query param (e.g. admin pasted
  //      `r=749630` from img.et builder, or `r=abc` typed by hand) →
  //      replace the value with `{id}` so each post still gets a
  //      unique URL after substitution.
  //   3. No `r=` query param at all → append `r={id}` so even a bare
  //      `https://img.et/1920/1080?type=landscape&format=avif` works.
  if (!template.includes('{id}')) {
    if (/[?&]r=[^&#]*/.test(template)) {
      template = template.replace(/([?&])r=[^&#]*/g, '$1r={id}');
    } else {
      template += (template.includes('?') ? '&' : '?') + 'r={id}';
    }
  }
  return template
    .replace(/\{id\}/g, String(postId))
    .replace(/\{w\}/g, '800')
    .replace(/\{h\}/g, '600');
}

export interface CoverPropsInput {
  src: string;
  alt?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Theme-facing helper for cover / hero / list images.
 *
 * Themes write `<img {...coverProps({ src, alt, priority })} />` —
 * no React component, no client boundary. The returned object stamps
 * the system hooks (`data-blog-image`, `data-loaded="0"`) and the
 * loading hints; everything else (placeholder, fade-in, scale effect,
 * lazy-load on/off) is handled by the global CSS + ImageEffects
 * client enhancer.
 *
 *  - priority=true   ⇒ loading="eager"  fetchPriority="high"
 *                     (HomePage hero, PostPage banner, first cover above the fold)
 *  - priority=false  ⇒ loading="lazy"   fetchPriority="auto"
 *                     (everything else; native lazy is enough)
 */
export function coverProps(input: CoverPropsInput): ImgHTMLAttributes<HTMLImageElement> & {
  'data-blog-image': '';
  'data-loaded': '0';
} {
  const { src, alt = '', priority = false, className, style } = input;
  return {
    src,
    alt,
    loading: priority ? 'eager' : 'lazy',
    fetchPriority: priority ? 'high' : 'auto',
    decoding: 'async',
    'data-blog-image': '',
    'data-loaded': '0',
    className,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
      ...style,
    },
  };
}
