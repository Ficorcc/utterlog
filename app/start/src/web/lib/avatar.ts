import { avatarPlatformUrls } from '@shared/avatar';

/**
 * 浏览器侧的头像候选链：给评论框预览「你留了这个邮箱会显示哪个头像」用。
 * 顺序与后端 services/avatar.ts 一致（平台地址来自 @shared/avatar，唯一一份）。
 */

function md5Hex(s: string): string {
  let h0 = 1732584193, h1 = -271733879, h2 = -1732584194, h3 = 271733878;
  const k: number[] = [], w: number[] = [];
  for (let i = 0; i < 64; i++) k[i] = Math.floor(2 ** 32 * Math.abs(Math.sin(i + 1)));
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) { bytes.push(192 | (c >> 6)); bytes.push(128 | (c & 63)); }
    else { bytes.push(224 | (c >> 12)); bytes.push(128 | ((c >> 6) & 63)); bytes.push(128 | (c & 63)); }
  }
  const bl = bytes.length * 8;
  bytes.push(128);
  while (bytes.length % 64 !== 56) bytes.push(0);
  bytes.push(bl & 0xff, (bl >> 8) & 0xff, (bl >> 16) & 0xff, (bl >> 24) & 0xff, 0, 0, 0, 0);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24);
    let [a, b, c, d] = [h0, h1, h2, h3];
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | ((~b) & d); g = i; }
      else if (i < 32) { f = (d & b) | ((~d) & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | (~d)); g = (7 * i) % 16; }
      const r = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
      const t = d; d = c; c = b;
      const x = (a + f + k[i] + w[g]) >>> 0;
      b = (b + (((x << r[i]) | (x >>> (32 - r[i]))) >>> 0)) >>> 0;
      a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
  }
  const hex = (n: number) => [0, 8, 16, 24].map(s => ((n >>> s) & 0xff).toString(16).padStart(2, '0')).join('');
  return hex(h0) + hex(h1) + hex(h2) + hex(h3);
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 邮箱 → 头像候选链（与后端同序）。邮箱为空返回空数组。 */
export async function avatarCandidatesForEmail(email: string, size = 80): Promise<string[]> {
  const mail = String(email || '').trim().toLowerCase();
  if (!mail) return [];
  const md5 = md5Hex(mail);
  const sha256 = await sha256Hex(mail).catch(() => '');
  return avatarPlatformUrls(md5, sha256, size);
}
