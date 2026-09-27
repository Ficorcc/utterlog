/**
 * Whono 主题工具函数。
 */

/** 只放行 http(s)、mailto 和站内绝对路径，挡掉 javascript: 这类危险协议。 */
export function safeHref(value?: string | null): string {
  const href = String(value || '').trim();
  return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(href) ? href : '';
}

/** 去掉摘要里的 HTML 标签并压平空白，超长截断。 */
export function plainText(value?: string | null, max = 0): string {
  const text = String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (max > 0 && text.length > max) return `${text.slice(0, max)}…`;
  return text;
}

/** 阅读模式的 localStorage 键名。 */
export const WHONO_READING_KEY = 'whono-reading';

/** 读取已保存的阅读模式偏好，取不到就返回 null。 */
export function readStoredReading(): 'immersive' | 'normal' | null {
  try {
    const value = localStorage.getItem(WHONO_READING_KEY);
    return value === 'immersive' || value === 'normal' ? value : null;
  } catch {
    return null;
  }
}

/** 写入阅读模式偏好，并把状态落到 body 的 data 属性上供 CSS 使用。 */
export function setReadingMode(mode: 'immersive' | 'normal') {
  document.body.dataset.whonoReading = mode;
  try {
    localStorage.setItem(WHONO_READING_KEY, mode);
  } catch {
    /* 隐私模式下 localStorage 可能不可写，忽略即可 */
  }
  return mode;
}

/** 在「沉浸阅读」和「普通」之间切换，返回切换后的状态。 */
export function toggleReadingMode(): 'immersive' | 'normal' {
  const current = document.body.dataset.whonoReading === 'immersive' ? 'immersive' : 'normal';
  return setReadingMode(current === 'immersive' ? 'normal' : 'immersive');
}
