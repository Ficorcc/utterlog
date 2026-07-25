import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config';
import { brandingExts } from './storage';

const FAVICON_SIZES = [16, 32, 48] as const;

async function loadSharp() {
  const sharpModule = await (new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>)('sharp').catch(() => null);
  const sharp = (sharpModule as { default?: unknown })?.default || sharpModule;
  if (!sharp || typeof sharp !== 'function') {
    throw new Error('图片处理模块不可用');
  }
  return sharp as (input: Buffer, options?: { density?: number }) => {
    resize: (w: number, h: number, opts?: Record<string, unknown>) => {
      png: () => { toBuffer: () => Promise<Buffer> };
    };
  };
}

function encodePngIco(images: Array<{ size: number; png: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries: Buffer[] = [];
  const data: Buffer[] = [];

  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    data.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...data]);
}

export async function buildFaviconIco(input: Buffer, ext: string): Promise<Buffer> {
  if (ext === 'ico') return input;

  const sharp = await loadSharp();
  const isSvg = ext === 'svg';
  const pngs = await Promise.all(FAVICON_SIZES.map(async (size) => {
    const png = await sharp(input, isSvg ? { density: 256 } : undefined)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return { size, png };
  }));

  return encodePngIco(pngs);
}

/**
 * favicon.ico 之外还要产出的 PNG 图标。浏览器和各家系统认的是文件名约定，
 * 不是随便什么尺寸都行：
 *   - favicon-16/32：标签页和书签栏
 *   - apple-touch-icon 180：iOS 添加到主屏（Safari 只认这个名字）
 *   - android-chrome 192/512：PWA，manifest 里引用的就是这两个
 * 命名沿用 realfavicongenerator 那套业界惯例，换别的名字客户端不会去找。
 */
export const FAVICON_PNG_ASSETS = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
] as const;

/**
 * 从上传的原图渲染整套 PNG。传 ico 进来会直接返回空 —— sharp 不解 ico，
 * 这种情况下只保留用户自己传的那个 .ico，不硬凑 PNG。
 */
export async function buildFaviconPngs(input: Buffer, ext: string): Promise<Array<{ name: string; bytes: Buffer }>> {
  if (ext === 'ico') return [];
  const sharp = await loadSharp();
  const isSvg = ext === 'svg';
  return Promise.all(FAVICON_PNG_ASSETS.map(async ({ name, size }) => ({
    name,
    bytes: await sharp(input, isSvg ? { density: 512 } : undefined)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer(),
  })));
}

export function clearBrandingFaviconFiles(dir: string, rmSync: (path: string, opts?: { force?: boolean }) => void) {
  for (const oldExt of brandingExts) {
    rmSync(join(dir, `favicon.${oldExt}`), { force: true });
  }
  for (const { name } of FAVICON_PNG_ASSETS) {
    rmSync(join(dir, name), { force: true });
  }
}

export function brandingFaviconIcoPath() {
  return join(config.uploadDir, 'branding', 'favicon.ico');
}

/** Map legacy /favicon.png|svg paths to /favicon.ico when the converted file exists. */
export function resolveFaviconUrl(stored: string): string {
  const value = (stored || '').trim();
  if (!value) return '';
  if (!/^\/favicon(?:\.[a-z0-9]+)?$/i.test(value)) return value;
  if (existsSync(brandingFaviconIcoPath())) return '/favicon.ico';
  return value;
}
