export const BLOG_THEME_NAMES = ['Azure', 'Renascent', 'ShanYing', 'Whono'] as const;

export const SUPPORTED_BLOG_THEMES = new Set<string>(BLOG_THEME_NAMES);

export const DEFAULT_BLOG_THEME = 'Azure';

export type BlogThemeName = (typeof BLOG_THEME_NAMES)[number];

/** Azure exposes four selectable accent palettes; other themes ignore the value. */
export const BLOG_THEME_ACCENTS = ['blue', 'red', 'green', 'gray'] as const;

export type BlogThemeAccent = (typeof BLOG_THEME_ACCENTS)[number];

export function normalizeBlogTheme(name: string): BlogThemeName {
  const trimmed = String(name || '').trim();
  return SUPPORTED_BLOG_THEMES.has(trimmed) ? (trimmed as BlogThemeName) : DEFAULT_BLOG_THEME;
}

/** Unknown / empty accent values fall back to blue, matching the historical default. */
export function normalizeBlogThemeAccent(name: string): BlogThemeAccent {
  const trimmed = String(name || '').trim().toLowerCase();
  return (BLOG_THEME_ACCENTS as readonly string[]).includes(trimmed) ? (trimmed as BlogThemeAccent) : 'blue';
}

/** Legacy alias used by web/blog theme loaders. */
export function normalizeThemeName(name: string): BlogThemeName {
  if (/^chred$/i.test(String(name || '').trim())) return 'Azure';
  return normalizeBlogTheme(name);
}

/** Map legacy Chred installs to Azure + red accent. */
export function resolveBlogTheme(rawTheme: string, rawAccent = '') {
  const themeRaw = String(rawTheme || '').trim();
  if (/^chred$/i.test(themeRaw)) {
    return { theme: 'Azure' as const, accent: 'red' as const, migratedFrom: 'Chred' as const };
  }
  const theme = normalizeBlogTheme(themeRaw);
  const accent: BlogThemeAccent = theme === 'Azure' ? normalizeBlogThemeAccent(rawAccent) : 'blue';
  return { theme, accent, migratedFrom: '' as const };
}

/**
 * Accent attribute written to <html>. Blue is the stylesheet default, so it is
 * deliberately emitted as "" (attribute omitted) to keep existing markup identical.
 */
export function blogThemeAccentAttr(accent: BlogThemeAccent) {
  return accent === 'blue' ? '' : accent;
}
