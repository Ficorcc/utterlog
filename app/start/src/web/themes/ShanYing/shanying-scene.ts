'use client';

/**
 * ShanYing · 山景图层
 *
 * 原主题把一个「跟随访客时间变化的富士山场景」做成了首页 Hero 与页脚的背景：
 * 清晨 / 白天 / 黄昏 / 夜晚四套基础图，另有云、雨、雪三种天气叠加层。
 * 这 7 张图已随主题包一起发布到 `/themes/ShanYing/scenes/`，因此既能被
 * 内置主题直接引用，也能被上传的主题 zip 原样带走。
 *
 * 天气无法可靠获取（Utterlog 的 visitorWeather 只有温度/湿度/天气码），
 * 所以默认只按时间挑场景；`options.shanying_scene` 可强制指定某一个。
 */

export const SHANYING_SCENES = ['dawn', 'day', 'sunset', 'night', 'cloud', 'rain', 'snow'] as const;

export type ShanYingScene = (typeof SHANYING_SCENES)[number];

export function sceneImageUrl(scene: ShanYingScene | string) {
  const safe = (SHANYING_SCENES as readonly string[]).includes(scene) ? scene : 'day';
  return `/themes/ShanYing/scenes/${safe}.webp`;
}

/**
 * 1280px 宽的版本，供 `srcset` 使用。
 *
 * 原图是 1774×887、单张约 339KB。Hero 是首页的 LCP 元素，而手机/平板/小笔记本
 * 的视口远小于 1774px，下载全尺寸纯属浪费。`sizes="100vw"` 让浏览器按视口宽度
 * 与 DPR 自己挑：窄屏取这张（约 160KB），宽屏仍回落到原图，桌面观感不变。
 */
export function sceneImageSmallUrl(scene: ShanYingScene | string) {
  const safe = (SHANYING_SCENES as readonly string[]).includes(scene) ? scene : 'day';
  return `/themes/ShanYing/scenes/${safe}-1280.webp`;
}

/** 按访客本地时间选场景，和原主题 `hour<6 || hour>=18` 的判定保持一致。 */
export function sceneByHour(hour: number): ShanYingScene {
  if (hour < 5) return 'night';
  if (hour < 8) return 'dawn';
  if (hour < 16) return 'day';
  if (hour < 19) return 'sunset';
  return 'night';
}

export function resolveScene(forced?: string, hour = new Date().getHours()): ShanYingScene {
  if (forced && (SHANYING_SCENES as readonly string[]).includes(forced)) return forced as ShanYingScene;
  return sceneByHour(hour);
}

/** 夜晚场景需要额外的暗色遮罩，保证叠在上面的白字仍然可读。 */
export function sceneIsDark(scene: ShanYingScene) {
  return scene === 'night' || scene === 'rain';
}

/* ── 四季图 ───────────────────────────────────────────────────────
 * 原主题页脚按当前月份换四季底图，Hero 的「照片堆」用的也是这四张。
 * 3-5 春 / 6-8 夏 / 9-11 秋 / 其余 冬，和原主题 `$season` 完全一致。
 */

export const SHANYING_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export type ShanYingSeason = (typeof SHANYING_SEASONS)[number];

export function seasonImageUrl(season: ShanYingSeason | string) {
  const safe = (SHANYING_SEASONS as readonly string[]).includes(season) ? season : 'spring';
  return `/themes/ShanYing/seasons/${safe}.webp`;
}

/**
 * 600px 正方形缩略图，供显示尺寸只有 66–240px 的位置使用：
 * Hero 的「照片堆」和分类台的分类标签图。
 *
 * 那两处以前直接引用 1672×941 的原图（每张约 300KB），而实际渲染框最大
 * 240×240 —— 四张缩略图加起来才抵得上一张原图，首屏能少下约 900KB。
 * 页脚与 404 页把季节图当全宽背景，仍用 seasonImageUrl() 取原图。
 */
export function seasonThumbUrl(season: ShanYingSeason | string) {
  const safe = (SHANYING_SEASONS as readonly string[]).includes(season) ? season : 'spring';
  return `/themes/ShanYing/seasons/${safe}-600.webp`;
}

export function seasonByMonth(month: number): ShanYingSeason {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function currentSeason(month = new Date().getMonth() + 1): ShanYingSeason {
  return seasonByMonth(month);
}
