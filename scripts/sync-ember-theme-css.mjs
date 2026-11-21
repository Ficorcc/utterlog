#!/usr/bin/env bun
/**
 * 生成 Ember 主题样式表（复刻 lawpan.cc 的 ember 主题）
 *
 *   bun run scripts/sync-ember-theme-css.mjs
 *
 * 做三件事：
 *   1. 抓取 https://lawpan.cc/themes/ember/assets/{main,pages,home}.css
 *      （lawpan.cc 是 LiteNote 站点，ember 主题即其内置主题）
 *   2. 机械改写两处：
 *      a. data-theme="light|dark" → data-ember-mode="light|dark"
 *         站点根元素的 data-theme 被前台主题系统占用（承载主题名），
 *         深浅色改用独立属性。
 *      b. 每条规则统一加 `html[data-theme="Ember"]` 作用域。
 *         线上加载顺序是「主题 styles.css → app bundle(index-*.css，
 *         内含 globals.css)」，同优先级下后加载的 globals 会盖掉主题，
 *         所以必须靠作用域把优先级抬上去。
 *   3. 末尾拼上 adapter.css（Utterlog 适配层，手写，不联网）。
 *
 * 产物：app/start/src/web/themes/Ember/styles.css
 * 该文件由本脚本生成，请勿手改；改样式请改 adapter.css 或上游 CSS。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const THEME_DIR = join(REPO, 'app/start/src/web/themes/Ember');
const ADAPTER = join(THEME_DIR, 'adapter.css');
const OUT = join(THEME_DIR, 'styles.css');

const UPSTREAM = ['main.css', 'pages.css', 'home.css'];
const BASE = 'https://lawpan.cc/themes/ember/assets/';
const SCOPE = 'html[data-theme="Ember"]';

const HEADER = `/* ============================================================
 * Ember 主题样式 —— 由 scripts/sync-ember-theme-css.mjs 生成
 * 上游：lawpan.cc/themes/ember（LiteNote 内置 ember 主题）
 * 请勿手改本文件；改样式请改 adapter.css 或重新运行生成脚本。
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
    if (part === 'html' || part.startsWith('html') || part.startsWith('html[') || part.startsWith('html:') || part.startsWith('html.')) {
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

/* ---------- 主流程 ---------- */

async function fetchUpstream(name) {
  const res = await fetch(`${BASE}${name}`);
  if (!res.ok) throw new Error(`fetch ${name} failed: ${res.status}`);
  return res.text();
}

const parts = [];
for (const file of UPSTREAM) {
  const raw = await fetchUpstream(file);
  const cleaned = raw
    .replace(/@charset\s+"[^"]*";/g, '')
    .replace(/data-theme="dark"/g, 'data-ember-mode="dark"')
    .replace(/data-theme="light"/g, 'data-ember-mode="light"')
    // 浅色规则改为「非暗色即浅色」：未写入属性时也按浅色渲染，
    // 避免首屏（脚本执行前）出现无样式状态。
    .replace(/html\[data-ember-mode="light"\]/g, 'html:not([data-ember-mode="dark"])');
  parts.push(`/* ---------- upstream: ${file} ---------- */\n${scopeCss(cleaned)}`);
}

let adapter = '';
try {
  adapter = readFileSync(ADAPTER, 'utf-8');
} catch {
  console.warn('[sync-ember-theme-css] adapter.css 不存在，跳过适配层');
}

/* ---------- 分页补丁：parts/*.css ----------
 * 各页面（归档页、动态页、关于页…）的样式补丁单独放在 parts/ 下，
 * 纯 CSS、不带主题作用域前缀，统一在这里按文件名顺序拼到适配层后面，
 * 便于按页面维护，同时保证补丁落在上游样式之后、优先级更高。
 * 拼进来时同样要加 html[data-theme="Ember"] 作用域 —— 否则补丁的优先级
 * 会低于应用层 globals.css 里同名的规则，改不动共享组件的样式。
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
  console.warn('[sync-ember-theme-css] parts 目录不存在，跳过分页补丁');
}

writeFileSync(
  OUT,
  `${HEADER}\n${parts.join('\n\n')}\n\n/* ---------- adapter ---------- */\n${scopeCss(adapter)}\n${partsCss}`,
  'utf-8',
);
console.log(`[sync-ember-theme-css] 已生成 ${OUT}`);
