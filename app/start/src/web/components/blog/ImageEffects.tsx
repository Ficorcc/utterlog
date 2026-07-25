'use client';

import { useEffect } from 'react';
import { imageEffectAttrs } from '@/lib/blog-image';

// Applies the admin-configured image display effect to every blog
// image and tracks load state for the global fade-in. Reads
// `image_display_effect`, `image_display_duration`, `image_lazy_load`,
// and `image_lightbox` from theme options and surfaces them as data
// attributes / CSS variables on <html> so:
//
//   - globals.css can key effect rules off [data-img-effect=…]
//   - PostContent / moments / albums click handlers can early-bail
//     when [data-img-lightbox="0"] (lightbox disabled by admin)
//   - This component itself sweeps `loading="lazy"` → `loading="eager"`
//     across all blog images when [data-img-lazy="0"] (lazy disabled)
//
// Three responsibilities:
//   1. Keep <html data-img-effect=…>, --img-effect-duration,
//      data-img-lazy, data-img-lightbox in sync. routes/__root.tsx
//      已经在 SSR 就把这四个值写到 <html> 上了（首屏必须有，否则 fade
//      规则晚一步生效会让图片闪一下），这里只负责选项变更后的重写 ——
//      两边共用 imageEffectAttrs() 保证算出同一个结果。
//   2. Track load state on every <img data-blog-image> via event
//      delegation: flip `data-loaded` to "1" on `load`, and on mount
//      sweep already-`complete` images so the hydration race doesn't
//      strand them on the placeholder forever.
//   3. For the `scale` effect (which needs a scroll trigger to feel
//      right), run an IntersectionObserver that flips
//      `data-img-effect-visible="1"` when the image enters the
//      viewport.
//
// Selector scope: any element carrying `data-blog-image`. Themes
// stamp this via `coverProps()` (lib/blog-image.ts); article-body
// images stamp it directly in components/blog/LazyImage.tsx.

interface Props {
  effect: string | undefined;
  durationMs: string | number | undefined;
  // String | bool because option values come from the API as strings
  // ("true"/"false") but the legacy default is bool true. Falsy =
  // disabled, anything else = enabled. We coerce to "0" / "1" before
  // writing the data attribute so consumers can do strict string
  // comparisons.
  lazyLoad?: string | boolean | undefined;
  lightbox?: string | boolean | undefined;
}

export default function ImageEffects({ effect, durationMs, lazyLoad, lightbox }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    // 与 SSR 同一份解析（含 lazy / lightbox 默认 ON、时长回落 500ms），
    // 所以正常情况下这几行写进去的值跟 HTML 里已有的一模一样，不会引起
    // 属性抖动；只有后台改了选项、ctx 更新时才真正变。
    const { effect: value, duration, lazy: lazyOn, lightbox: lightboxOn } = imageEffectAttrs({
      image_display_effect: effect,
      image_display_duration: durationMs,
      image_lazy_load: lazyLoad,
      image_lightbox: lightbox,
    });
    root.dataset.imgEffect = value;
    root.style.setProperty('--img-effect-duration', `${duration}ms`);
    root.dataset.imgLazy = lazyOn ? '1' : '0';
    root.dataset.imgLightbox = lightboxOn ? '1' : '0';

    // ── (2) load tracking ──────────────────────────────────────────
    // Mark already-loaded images (browser finished the download
    // before React attached). Without this they stay on
    // `data-loaded="0"` forever and the placeholder never lifts.
    const sweep = () => {
      document
        .querySelectorAll<HTMLImageElement>('img[data-blog-image][data-loaded="0"]')
        .forEach((img) => {
          if (img.complete && img.naturalWidth > 0) {
            img.dataset.loaded = '1';
          }
        });

      // (extra) Honour the lazy-load toggle by overriding the
      // `loading` attribute. Components render `loading="lazy"` in
      // JSX (the historical default); when the admin turns lazy off
      // we want eager loads instead. We also clear browser-native
      // lazy gating so off-screen images start downloading immediately.
      if (!lazyOn) {
        document
          .querySelectorAll<HTMLImageElement>('img[data-blog-image][loading="lazy"]')
          .forEach((img) => { img.loading = 'eager'; });
      }
    };
    sweep();

    // Capture-phase listener so we hear `load` events that don't
    // bubble. One listener for the whole page covers every theme
    // cover, hero, and article body image.
    const onLoad = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === 'IMG' && (t as HTMLImageElement).dataset.blogImage !== undefined) {
        (t as HTMLImageElement).dataset.loaded = '1';
      }
    };
    document.addEventListener('load', onLoad, true);

    // New images may stream in (PJAX page swap, comment renders, etc).
    // Re-sweep on DOM mutation so they don't get stuck.
    const mo = new MutationObserver(sweep);
    mo.observe(document.body, { childList: true, subtree: true });

    // ── (3) scroll-triggered visibility ───────────────────────────
    // 永远跑一个 IO 标记图在不在视口 —— 给 fade 和 scale 共用。
    //
    // Why: Chrome 的 `loading="lazy"` 默认会在视口外 ~3000px 时就预拉
    // 图片；如果 fade 只看 `data-loaded`，那些图在用户滚到之前就完
    // 成了 blur→sharp 过渡 ——> 用户滚下去看到的是「已清晰的图」，没
    // 有 fade 体感。让 CSS 同时要求 `data-img-visible=1` 才解除模糊，
    // 这样图先在视口外完成下载（loaded=1）但 stays blurred，进视口
    // 时（visible=1）才开始 fade，用户**始终能看到淡入**。
    //
    // rootMargin: -10% bottom 让触发延迟到图有 10% 进入视口（避免一
    // 个像素冒头就 fire 显得突兀）；scale 之前用的 -40px 类似但更
    // 紧。两者都接受，统一用 -10% 体感更跟手。
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const t = e.target as HTMLElement;
            t.dataset.imgVisible = '1';
            // 兼容旧名 —— scale 效果的旧 CSS 仍可能读 data-img-effect-visible
            t.dataset.imgEffectVisible = '1';
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    const attachIo = () => {
      document
        .querySelectorAll<HTMLElement>('img[data-blog-image]')
        .forEach((el) => {
          if (el.dataset.imgEffectWatched) return;
          el.dataset.imgEffectWatched = '1';
          io.observe(el);
        });
    };
    attachIo();
    const moIo = new MutationObserver(attachIo);
    moIo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('load', onLoad, true);
      mo.disconnect();
      moIo.disconnect();
      io.disconnect();
    };
  }, [effect, durationMs, lazyLoad, lightbox]);

  return null;
}
