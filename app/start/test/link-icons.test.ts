import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { extractIconCandidates } from '../src/backend/services/link-icons';
import { icoToPng, isIco } from '../src/backend/media/ico-decode';
import { assertPublicHttpUrl, normalizePublicHttpUrl } from '../src/backend/http/public-url';

/**
 * 友链图标抓取。
 *
 * 这里抓的是**用户填进后台的任意 URL**，所以第一位是 SSRF：内网地址必须进不去，
 * 跳转也不能把校验绕过去（公网首页 302 到 127.0.0.1 是最常见的写法，抓取实现
 * 因此用 redirect:'manual' 逐跳校验，而不是让 fetch 自动跟随）。
 */

describe('SSRF 防护', () => {
  test('本机和内网地址一律拒绝', () => {
    for (const bad of [
      'http://localhost/favicon.ico',
      'http://127.0.0.1/',
      'http://127.0.0.1:9260/api/v1/admin/stats',
      'http://0.0.0.0/',
      'http://10.0.0.5/',
      'http://172.16.3.9/',
      'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data/',  // 云厂商元数据服务
      'http://[::1]/',
      'http://[fd00::1]/',
    ]) {
      expect(() => normalizePublicHttpUrl(bad)).toThrow();
    }
  });

  test('非 http(s) 协议拒绝', () => {
    for (const bad of ['file:///etc/passwd', 'gopher://evil.com/', 'ftp://example.com/x']) {
      expect(() => normalizePublicHttpUrl(bad)).toThrow();
    }
  });

  test('URL 里夹带凭据的拒绝', () => {
    expect(() => normalizePublicHttpUrl('http://user:pass@example.com/')).toThrow();
  });

  test('域名解析到内网的也要拒绝 —— 光看字面量挡不住 DNS 指回内网', async () => {
    // localtest.me 这类域名公开解析到 127.0.0.1，是绕过字面量检查的经典手法。
    // 解析不到（离线 / 上游没有这条记录）时同样应该抛错，不能放行。
    await expect(assertPublicHttpUrl('http://localtest.me/favicon.ico')).rejects.toThrow();
  });

  test('正常的公网地址放行', () => {
    expect(normalizePublicHttpUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizePublicHttpUrl('example.com')).toBe('https://example.com');
  });
});

describe('从 HTML 里挑图标', () => {
  const base = 'https://example.com/';

  test('相对地址拼成绝对地址', () => {
    const html = `<link rel="icon" href="/static/fav.png">`;
    expect(extractIconCandidates(html, base)).toEqual(['https://example.com/static/fav.png']);
  });

  test('按 sizes 从大到小排，大图优先', () => {
    const html = `
      <link rel="icon" sizes="32x32" href="/small.png">
      <link rel="apple-touch-icon" sizes="180x180" href="/big.png">
      <link rel="icon" sizes="16x16" href="/tiny.png">
    `;
    expect(extractIconCandidates(html, base)).toEqual([
      'https://example.com/big.png',
      'https://example.com/small.png',
      'https://example.com/tiny.png',
    ]);
  });

  test('认得 shortcut icon 和单引号、大写标签', () => {
    const html = `<LINK REL='shortcut icon' HREF='/fav.ico'>`;
    expect(extractIconCandidates(html, base)).toEqual(['https://example.com/fav.ico']);
  });

  test('属性不加引号也要认 —— HTML5 合法写法，友链里真有', () => {
    // 早先 href 的正则强制要求引号，这两个站点被判成「没有图标」白白退回外部服务。
    // 左边是 thirdshire.com 的写法，右边是 koobai.com 的。
    expect(extractIconCandidates('<link rel="shortcut icon" href=/knitting.ico>', base))
      .toEqual(['https://example.com/knitting.ico']);
    expect(extractIconCandidates('<link rel=icon href=https://img.koobai.com/koobai.png>', base))
      .toEqual(['https://img.koobai.com/koobai.png']);
  });

  test('无引号的 rel 不能把后面的属性一起吃进来', () => {
    // rel 的值到空格为止；早先的 [^"'>]+ 会一路吃到 '>'，把 href 也算进 rel 里
    expect(extractIconCandidates('<link rel=stylesheet href=/app.css>', base)).toEqual([]);
    expect(extractIconCandidates('<link rel=preload href=/icon.png as=image>', base)).toEqual([]);
  });

  test('三种引号写法混排都能取到 sizes', () => {
    const html = `
      <link rel=icon sizes=16x16 href=/a.png>
      <link rel='icon' sizes='64x64' href='/b.png'>
      <link rel="icon" sizes="32x32" href="/c.png">
    `;
    expect(extractIconCandidates(html, base)).toEqual([
      'https://example.com/b.png',
      'https://example.com/c.png',
      'https://example.com/a.png',
    ]);
  });

  test('data: 内联图标跳过 —— 抓下来也没有可缓存的地址', () => {
    const html = `<link rel="icon" href="data:image/png;base64,iVBORw0KGgo=">`;
    expect(extractIconCandidates(html, base)).toEqual([]);
  });

  test('不是图标的 link 一律忽略', () => {
    const html = `
      <link rel="stylesheet" href="/app.css">
      <link rel="canonical" href="https://example.com/post">
      <link rel="preconnect" href="https://cdn.example.com">
    `;
    expect(extractIconCandidates(html, base)).toEqual([]);
  });

  test('重复地址只留一个', () => {
    const html = `
      <link rel="icon" href="/fav.png">
      <link rel="apple-touch-icon" href="/fav.png">
    `;
    expect(extractIconCandidates(html, base)).toEqual(['https://example.com/fav.png']);
  });

  test('跨站的图标地址照样收下 —— 后续抓取还会再过一次 SSRF 校验', () => {
    const html = `<link rel="icon" href="https://cdn.other.com/i.png">`;
    expect(extractIconCandidates(html, base)).toEqual(['https://cdn.other.com/i.png']);
  });

  test('畸形 HTML 不抛异常', () => {
    for (const html of ['', '<link', '<link rel=icon>', '<link rel="icon" href="">', '<link rel="icon" href="::::">']) {
      expect(() => extractIconCandidates(html, base)).not.toThrow();
    }
  });
});

describe('ICO 解码', () => {
  // sharp（libvips）不支持 ICO 输入，而 /favicon.ico 是抓不到 <link rel=icon>
  // 时唯一的回退路径 —— 不自己解开这一层，那条路径就是 100% 失败。

  /** 造一个内嵌 PNG 的 ico。 */
  async function makePngIco(size: number) {
    const png = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 20, g: 120, b: 200, alpha: 1 } },
    }).png().toBuffer();
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size;
    entry[1] = size === 256 ? 0 : size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(22, 12);
    return Buffer.concat([header, entry, png]);
  }

  /** 造一个内嵌 32 位 BMP 的 ico —— GitHub、百度用的就是这种。 */
  function makeBmpIco(size: number) {
    const rowSize = size * 4;
    const dib = Buffer.alloc(40 + rowSize * size + Math.floor((size + 31) / 32) * 4 * size);
    dib.writeUInt32LE(40, 0);
    dib.writeInt32LE(size, 4);
    dib.writeInt32LE(size * 2, 8);   // ICO 里高度是两倍：颜色 + AND 蒙版
    dib.writeUInt16LE(1, 12);
    dib.writeUInt16LE(32, 14);
    for (let i = 0; i < size * size; i++) {
      const at = 40 + i * 4;
      dib[at] = 200; dib[at + 1] = 120; dib[at + 2] = 20; dib[at + 3] = 255;  // BGRA
    }
    const header = Buffer.alloc(6);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    const entry = Buffer.alloc(16);
    entry[0] = size; entry[1] = size;
    entry.writeUInt32LE(dib.length, 8);
    entry.writeUInt32LE(22, 12);
    return Buffer.concat([header, entry, dib]);
  }

  test('认得出 ICO，也不会把 PNG 误判成 ICO', async () => {
    expect(isIco(await makePngIco(32))).toBe(true);
    expect(isIco(makeBmpIco(32))).toBe(true);
    const plainPng = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#fff' } }).png().toBuffer();
    expect(isIco(plainPng)).toBe(false);
    expect(isIco(Buffer.from('<!DOCTYPE html>'))).toBe(false);
    expect(isIco(Buffer.alloc(0))).toBe(false);
  });

  test('内嵌 PNG 的 ico 能解出来', async () => {
    const png = await icoToPng(await makePngIco(48));
    expect(png).not.toBeNull();
    const meta = await sharp(png!).metadata();
    expect(meta.width).toBe(48);
  });

  test('内嵌 BMP 的 ico 能解出来，且颜色没有 BGR/RGB 弄反', async () => {
    const png = await icoToPng(makeBmpIco(32));
    expect(png).not.toBeNull();
    const { data } = await sharp(png!).raw().toBuffer({ resolveWithObject: true });
    // 写进去的是 BGRA(200,120,20)，读出来应该是 RGB(20,120,200)
    expect([data[0], data[1], data[2]]).toEqual([20, 120, 200]);
  });

  test('多张时取最大的那张', async () => {
    const small = await sharp({ create: { width: 16, height: 16, channels: 4, background: '#f00' } }).png().toBuffer();
    const large = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#0f0' } }).png().toBuffer();
    const header = Buffer.alloc(6);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(2, 4);
    const dirSize = 6 + 32;
    const e1 = Buffer.alloc(16);
    e1[0] = 16; e1[1] = 16;
    e1.writeUInt32LE(small.length, 8);
    e1.writeUInt32LE(dirSize, 12);
    const e2 = Buffer.alloc(16);
    e2[0] = 64; e2[1] = 64;
    e2.writeUInt32LE(large.length, 8);
    e2.writeUInt32LE(dirSize + small.length, 12);
    const png = await icoToPng(Buffer.concat([header, e1, e2, small, large]));
    expect((await sharp(png!).metadata()).width).toBe(64);
  });

  test('8 位调色板的老 ico 也要能解 —— 友链里就有这种 16x16 图标', async () => {
    const size = 16;
    const palette = Buffer.alloc(256 * 4);
    palette[0] = 200; palette[1] = 120; palette[2] = 20; palette[3] = 0;   // 索引 0 = BGRA
    const rowSize = Math.floor((size * 8 + 31) / 32) * 4;
    const maskRow = Math.floor((size + 31) / 32) * 4;
    const dib = Buffer.alloc(40 + palette.length + rowSize * size + maskRow * size);
    dib.writeUInt32LE(40, 0);
    dib.writeInt32LE(size, 4);
    dib.writeInt32LE(size * 2, 8);
    dib.writeUInt16LE(1, 12);
    dib.writeUInt16LE(8, 14);        // 8 位索引色
    dib.writeUInt32LE(256, 32);      // 调色板项数
    palette.copy(dib, 40);
    // 像素全指向索引 0；AND 蒙版留 0 表示不透明
    const header = Buffer.alloc(6);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    const entry = Buffer.alloc(16);
    entry[0] = size; entry[1] = size;
    entry.writeUInt32LE(dib.length, 8);
    entry.writeUInt32LE(22, 12);

    const png = await icoToPng(Buffer.concat([header, entry, dib]));
    expect(png).not.toBeNull();
    const { data } = await sharp(png!).raw().toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([20, 120, 200]);
  });

  test('调色板索引越界时返回 null，不读到 buffer 外面去', async () => {
    const size = 4;
    const rowSize = Math.floor((size * 8 + 31) / 32) * 4;
    const dib = Buffer.alloc(40 + 4 * 4 + rowSize * size);   // 只给 4 个调色板项
    dib.writeUInt32LE(40, 0);
    dib.writeInt32LE(size, 4);
    dib.writeInt32LE(size * 2, 8);
    dib.writeUInt16LE(1, 12);
    dib.writeUInt16LE(8, 14);
    dib.writeUInt32LE(4, 32);
    dib.fill(0xff, 40 + 16);          // 像素全指向索引 255，远超 4 项
    const header = Buffer.alloc(6);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    const entry = Buffer.alloc(16);
    entry[0] = size; entry[1] = size;
    entry.writeUInt32LE(dib.length, 8);
    entry.writeUInt32LE(22, 12);
    expect(await icoToPng(Buffer.concat([header, entry, dib]))).toBeNull();
  });

  test('损坏和越界的 ico 返回 null，不抛异常', async () => {
    const truncated = (await makePngIco(32)).subarray(0, 20);
    expect(await icoToPng(truncated)).toBeNull();
    // 目录项声称的数据远超文件长度
    const evil = Buffer.alloc(22);
    evil.writeUInt16LE(1, 2);
    evil.writeUInt16LE(1, 4);
    evil.writeUInt32LE(0xffffff, 14);
    evil.writeUInt32LE(0xffffff, 18);
    expect(await icoToPng(evil)).toBeNull();
    expect(await icoToPng(Buffer.from('not an ico at all'))).toBeNull();
  });
});
