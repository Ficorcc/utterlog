import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config';
import { runtimePaths } from './paths';

function screenshotCandidates(file: string): string[] {
  const names = new Set<string>();
  if (file) names.add(file);
  if (/\.png$/i.test(file)) names.add(file.replace(/\.png$/i, '.svg'));
  names.add('screenshot.svg');
  names.add('screenshot.png');
  return [...names];
}

export function themeAssetRoots(themeId: string): string[] {
  return [
    join(config.contentDir, 'themes', themeId),
    join(runtimePaths.builtinPublicThemesDir, themeId),
    join(runtimePaths.builtinThemesDir, themeId),
  ];
}

/** 拒绝越界路径（../ 或绝对路径），避免资源解析逃出主题目录 */
function isSafeAssetPath(file: string): boolean {
  if (!file) return false;
  const normalized = file.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.includes(':')) return false;
  return !normalized.split('/').some((part) => part === '..');
}

export function resolveThemeAssetPath(themeId: string, file: string): string | null {
  if (!isSafeAssetPath(file)) return null;
  const roots = themeAssetRoots(themeId);

  // 先按请求的原名逐个根查找，命中即返回。
  // 顺序不能反：截图兜底名（screenshot.svg）排在候选里，若在「原名」之前
  // 逐根匹配，一个只存在于源码目录的深层资源（图标、字体）会被 public 根下的
  // screenshot.svg 顶掉 —— 线上表现为图标请求返回预览图。
  for (const base of roots) {
    const path = join(base, file);
    if (existsSync(path)) return path;
  }

  // 再退回截图候选：主题列表里的预览图只声明了 .png，实际是 .svg。
  for (const base of roots) {
    for (const name of screenshotCandidates(file)) {
      const path = join(base, name);
      if (existsSync(path)) return path;
    }
  }
  return null;
}

export function resolveThemePreviewUrl(themeId: string, screenshot = ''): string {
  const path = resolveThemeAssetPath(themeId, screenshot || 'screenshot.png');
  if (!path) return '';
  const filename = path.split('/').pop() || '';
  return `/themes/${themeId}/${filename}`;
}
