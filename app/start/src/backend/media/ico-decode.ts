import sharp from 'sharp';

/**
 * 把 .ico 解成 sharp 能吃的图片。
 *
 * sharp（libvips）不支持 ICO 输入 —— 它的输入格式只有 jpeg/png/webp/tiff/gif/svg/heif/raw。
 * 而站点的 /favicon.ico 恰恰是抓不到 <link rel=icon> 时唯一的回退路径，不解开
 * 这一层，那条路径就是 100% 失败。
 *
 * ICO 是个很薄的容器：6 字节文件头 + 每张图 16 字节目录项 + 各自的数据块。
 * 数据块要么是整个 PNG（切出来直接给 sharp），要么是去掉文件头的 BMP（DIB，
 * 得自己转成裸像素喂给 sharp 的 raw 输入）。两种都遇得到 —— 实测 GitHub 和
 * 百度用 BMP，本站自己生成的用 PNG。
 */

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type IcoEntry = {
  width: number;
  height: number;
  offset: number;
  size: number;
};

function readEntries(buffer: Buffer): IcoEntry[] {
  // reserved(2) + type(2) + count(2)；type 1 = 图标，2 = 光标
  if (buffer.length < 6) return [];
  const type = buffer.readUInt16LE(2);
  if (type !== 1 && type !== 2) return [];
  const count = buffer.readUInt16LE(4);
  if (count === 0 || count > 64) return [];

  const entries: IcoEntry[] = [];
  for (let index = 0; index < count; index++) {
    const at = 6 + index * 16;
    if (at + 16 > buffer.length) break;
    const size = buffer.readUInt32LE(at + 8);
    const offset = buffer.readUInt32LE(at + 12);
    if (size === 0 || offset + size > buffer.length) continue;
    entries.push({
      // 目录项里 0 表示 256，这是格式定义
      width: buffer[at] || 256,
      height: buffer[at + 1] || 256,
      offset,
      size,
    });
  }
  return entries;
}

/**
 * DIB（BITMAPINFOHEADER + 可选调色板 + 像素）转裸 RGBA。
 *
 * 24/32 位真彩直接读，≤8 位走调色板 —— 老站点的 16x16 favicon 至今还是 8 位
 * 索引色（实测友链里就有），不支持的话这些站只能退回外部 favicon 服务。
 */
function dibToRaw(dib: Buffer): { data: Buffer; width: number; height: number } | null {
  if (dib.length < 40) return null;
  const headerSize = dib.readUInt32LE(0);
  if (headerSize < 40 || headerSize > dib.length) return null;
  const width = dib.readInt32LE(4);
  // ICO 里的高度是实际高度的两倍：下半是颜色，上半是 AND 蒙版
  const storedHeight = dib.readInt32LE(8);
  const height = Math.floor(storedHeight / 2);
  const bitCount = dib.readUInt16LE(14);
  const compression = dib.readUInt32LE(16);
  if (width <= 0 || height <= 0 || width > 1024 || height > 1024) return null;
  if (compression !== 0) return null;
  if (![1, 2, 4, 8, 24, 32].includes(bitCount)) return null;

  const indexed = bitCount <= 8;
  // 调色板紧跟在头后面，每项 4 字节 BGRA
  const paletteCount = indexed ? (dib.readUInt32LE(32) || (1 << bitCount)) : 0;
  const paletteStart = headerSize;
  const pixelStart = paletteStart + paletteCount * 4;
  if (indexed && pixelStart > dib.length) return null;

  // BMP 每行按 4 字节对齐
  const rowSize = Math.floor((width * bitCount + 31) / 32) * 4;
  if (pixelStart + rowSize * height > dib.length) return null;

  const out = Buffer.alloc(width * height * 4);
  // BMP 自下而上存，读的时候翻回来
  for (let y = 0; y < height; y++) {
    const srcRow = pixelStart + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const dst = (y * width + x) * 4;
      if (indexed) {
        // 一个字节里塞了 8/bitCount 个像素，从高位往低位取
        const bitOffset = x * bitCount;
        const byte = dib[srcRow + (bitOffset >> 3)];
        const shift = 8 - bitCount - (bitOffset & 7);
        const index = (byte >> shift) & ((1 << bitCount) - 1);
        const entry = paletteStart + index * 4;
        if (entry + 3 >= dib.length) return null;
        out[dst] = dib[entry + 2];
        out[dst + 1] = dib[entry + 1];
        out[dst + 2] = dib[entry];
        out[dst + 3] = 255;   // 调色板没有 alpha，透明度全靠下面的 AND 蒙版
      } else {
        const src = srcRow + x * (bitCount / 8);
        out[dst] = dib[src + 2];      // BGRA → RGBA
        out[dst + 1] = dib[src + 1];
        out[dst + 2] = dib[src];
        out[dst + 3] = bitCount === 32 ? dib[src + 3] : 255;
      }
    }
  }

  // 索引色图的透明区域只存在 AND 蒙版里，不套用的话背景会是一块实心色
  if (indexed) {
    const maskStart = pixelStart + rowSize * height;
    const maskRowSize = Math.floor((width + 31) / 32) * 4;
    if (maskStart + maskRowSize * height <= dib.length) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const maskByte = dib[maskStart + (height - 1 - y) * maskRowSize + (x >> 3)];
          if ((maskByte >> (7 - (x & 7))) & 1) out[(y * width + x) * 4 + 3] = 0;
        }
      }
    }
  }

  // 32 位图的 alpha 通道有时整个是 0（老工具生成的），那样转出来是全透明。
  // 这种情况退回 AND 蒙版，蒙版位为 1 表示透明。
  if (bitCount === 32 && out.every((value, index) => index % 4 !== 3 || value === 0)) {
    const maskStart = pixelStart + rowSize * height;
    const maskRowSize = Math.floor((width + 31) / 32) * 4;
    const hasMask = maskStart + maskRowSize * height <= dib.length;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dst = (y * width + x) * 4 + 3;
        if (!hasMask) {
          out[dst] = 255;
          continue;
        }
        const maskByte = dib[maskStart + (height - 1 - y) * maskRowSize + (x >> 3)];
        out[dst] = (maskByte >> (7 - (x & 7))) & 1 ? 0 : 255;
      }
    }
  }

  return { data: out, width, height };
}

/** 这个 buffer 是不是 ICO / CUR。 */
export function isIco(buffer: Buffer): boolean {
  if (buffer.length < 6) return false;
  if (buffer.readUInt16LE(0) !== 0) return false;
  const type = buffer.readUInt16LE(2);
  return type === 1 || type === 2;
}

/**
 * 取 ico 里最大的一张，转成 PNG 返回。解不出来返回 null。
 *
 * 从大到小逐张试，而不是只试最大的那张：一个 ico 里混着 PNG 和调色板 BMP 是
 * 常见的，最大的那张解不开不代表别的也不行。
 */
export async function icoToPng(buffer: Buffer): Promise<Buffer | null> {
  const entries = readEntries(buffer).sort((a, b) => b.width * b.height - a.width * a.height);
  for (const entry of entries) {
    const chunk = buffer.subarray(entry.offset, entry.offset + entry.size);
    try {
      if (chunk.subarray(0, 8).equals(PNG_MAGIC)) {
        // 已经是 PNG，验证一下能解码再原样返回
        await sharp(chunk).metadata();
        return chunk;
      }
      const raw = dibToRaw(chunk);
      if (!raw) continue;
      return await sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } })
        .png()
        .toBuffer();
    } catch {
      // 这一张不行就试下一张
    }
  }
  return null;
}
