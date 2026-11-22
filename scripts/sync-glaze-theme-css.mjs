#!/usr/bin/env bun
/**
 * 生成 Glaze 主题样式表（深度复刻 glaze WordPress 主题的视觉层）
 *
 *   bun run scripts/sync-glaze-theme-css.mjs
 *
 * 做四件事：
 *   1. 读取本仓库内置的上游样式（app/start/src/web/themes/Glaze/upstream/*.css），
 *      上游来自 glaze WordPress 主题的 assets/css，随主题一起 vendor 进来，
 *      不联网 —— 构建过程不依赖外部站点可用性。
 *   2. 机械改写资源路径：上游 CSS 里字体/图标用 `../fonts/`、`../images/` 相对
 *      引用（相对 assets/css/ 目录），而本项目样式表发布在 /themes/Glaze/styles.css，
 *      必须改成 `assets/fonts/`、`assets/images/` 才能命中同一路径下的资源。
 *   3. 每条规则统一加 `html[data-theme="Glaze"]` 作用域。线上加载顺序是
 *      「主题 styles.css → app bundle(globals.css)」，同优先级下后加载的 globals
 *      会盖掉主题，必须靠作用域把优先级抬上去。`:root` / `html` 规则改为
 *      「作用域本身」，这样根元素上的 CSS 变量只在 Glaze 生效。
 *   4. 末尾拼上 adapter.css（Utterlog 适配层，手写）与 parts/*.css（分页面补丁）。
 *
 * 产物：app/start/src/web/themes/Glaze/styles.css
 * 该文件由本脚本生成，请勿手改；改样式请改 adapter.css / parts/ 或上游文件。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const THEME_DIR = join(REPO, 'app/start/src/web/themes/Glaze');
const UPSTREAM_DIR = join(THEME_DIR, 'upstream');
const ADAPTER = join(THEME_DIR, 'adapter.css');
const OUT = join(THEME_DIR, 'styles.css');

const UPSTREAM = ['main.css', 'wide-dock.css', 'wide-rails.css'];
const SCOPE = 'html[data-theme="Glaze"]';

const HEADER = `/* ============================================================
 * Glaze 主题样式 —— 由 scripts/sync-glaze-theme-css.mjs 生成
 * 上游：glaze（WestNote 风格的 WordPress 主题）
 * 请勿手改本文件；改样式请改 adapter.css / parts/ 或重新运行生成脚本。
 * ============================================================ */
`;

/* ---------- CSS 解析：按顶层规则切分 ---------- */

function findBlockEnd(css, start) {
  // start 指向 '{'，返回配对 '}' 的下标
  let depth = 0;
  let i = start;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === '\\') i += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

function splitSelectorList(sel) {
  const parts = [];
  let depth = 0;
  let current = '';
  let i = 0;
  while (i < sel.length) {
    const ch = sel[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      current += ch;
      i += 1;
      while (i < sel.length && sel[i] !== quote) {
        if (sel[i] === '\\') {
          current += sel[i];
          i += 1;
        }
        current += sel[i];
        i += 1;
      }
      current += sel[i] ?? '';
      i += 1;
      continue;
    }
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function scopeSelector(sel) {
  const parts = splitSelectorList(sel).map((part) => {
    if (!part) return part;
    if (part.startsWith(':root')) {
      return SCOPE + part.slice(':root'.length);
    }
    if (part === 'html' || part.startsWith('html[') || part.startsWith('html:') || part.startsWith('html.') || part.startsWith('html ')) {
      return SCOPE + part.slice('html'.length);
    }
    return `${SCOPE} ${part}`;
  });
  return parts.join(', ');
}

/** 不需要加作用域的 at-rule：其内容不是选择器 */
const VERBATIM_AT_RULES = new Set([
  '@charset',
  '@import',
  '@keyframes',
  '@-webkit-keyframes',
  '@font-face',
  '@page',
  '@namespace',
  '@property',
]);

function scopeCss(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    // 跳过空白与注释
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      out += css.slice(i, stop);
      i = stop;
      continue;
    }
    if (/\s/.test(css[i])) {
      out += css[i];
      i += 1;
      continue;
    }
    // 读取 prelude
    let depth = 0;
    let j = i;
    let prelude = '';
    while (j < css.length) {
      const ch = css[j];
      if (ch === '"' || ch === "'") {
        const quote = ch;
        prelude += ch;
        j += 1;
        while (j < css.length && css[j] !== quote) {
          prelude += css[j];
          if (css[j] === '\\') {
            j += 1;
            prelude += css[j];
          }
          j += 1;
        }
        prelude += css[j] ?? '';
        j += 1;
        continue;
      }
      if (ch === '{' && depth === 0) break;
      if (ch === ';') break;
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      prelude += ch;
      j += 1;
    }
    const trimmed = prelude.trim();
    if (css[j] === ';') {
      // 语句型 at-rule（@import / @charset）
      out += trimmed + ';\n';
      i = j + 1;
      continue;
    }
    if (css[j] !== '{') {
      out += prelude;
      i = j + 1;
      continue;
    }
    const blockEnd = findBlockEnd(css, j);
    if (blockEnd === -1) {
      out += css.slice(i);
      break;
    }
    const body = css.slice(j + 1, blockEnd);
    if (trimmed.startsWith('@')) {
      const name = trimmed.split(/[\s({]/)[0].toLowerCase();
      if (VERBATIM_AT_RULES.has(name)) {
        out += `${trimmed} {${body}}\n`;
      } else {
        // @media / @supports / @layer / @container：递归处理内部规则
        out += `${trimmed} {\n${scopeCss(body)}\n}\n`;
      }
    } else {
      out += `${scopeSelector(trimmed)} {${body}}\n`;
    }
    i = blockEnd + 1;
  }
  return out;
}

/* ---------- 上游资源路径改写 ---------- */

/**
 * 上游 CSS 位于 assets/css/，字体与图标以 `../fonts/`、`../images/` 引用。
 * 本项目样式表发布在 /themes/Glaze/styles.css，资源放在 /themes/Glaze/assets/ 下，
 * 所以要把 `../fonts/`、`../images/` 改写成 `assets/fonts/`、`assets/images/`。
 */
function rewriteAssetUrls(css) {
  return css
    .replace(/url\(\s*(['"]?)\.\.\/fonts\//g, 'url($1assets/fonts/')
    .replace(/url\(\s*(['"]?)\.\.\/images\//g, 'url($1assets/images/');
}

/* ---------- 主流程 ---------- */

const parts = [];
for (const file of UPSTREAM) {
  const raw = readFileSync(join(UPSTREAM_DIR, file), 'utf-8');
  const cleaned = rewriteAssetUrls(raw.replace(/@charset\s+"[^"]*";/g, ''));
  parts.push(`/* ---------- upstream: ${file} ---------- */\n${scopeCss(cleaned)}`);
}

let adapter = '';
try {
  adapter = readFileSync(ADAPTER, 'utf-8');
} catch {
  console.warn('[sync-glaze-theme-css] adapter.css 不存在，跳过适配层');
}

/* ---------- 分页面补丁：parts/*.css ----------
 * 与 Ember 同构：各页面（归档页、说说页、关于页…）的样式补丁单独放在 parts/ 下，
 * 纯 CSS、不带主题作用域前缀，统一在这里按文件名顺序拼到适配层后面，
 * 保证补丁落在上游样式之后、优先级更高。
 */
const PARTS_DIR = join(THEME_DIR, 'parts');
let partsCss = '';
try {
  const files = readdirSync(PARTS_DIR)
    .filter((name) => name.endsWith('.css'))
    .sort();
  for (const name of files) {
    const body = readFileSync(join(PARTS_DIR, name), 'utf-8').trim();
    if (body) partsCss += `/* ---------- part: ${name} ---------- */\n${scopeCss(body)}\n\n`;
  }
} catch {
  console.warn('[sync-glaze-theme-css] parts 目录不存在，跳过分页补丁');
}

writeFileSync(
  OUT,
  `${HEADER}\n${parts.join('\n\n')}\n\n/* ---------- adapter ---------- */\n${scopeCss(adapter)}\n${partsCss}`,
  'utf-8',
);
console.log(`[sync-glaze-theme-css] 已生成 ${OUT}`);
