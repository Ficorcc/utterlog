import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 后台表格行的操作按钮曾经是 130 处各写各的：同一个「删除」在不同页面红色深浅
// 不一样，同一个「隐藏」有的用 warning 有的用默认色。收口到 RowAction 之后，
// 这里守住不再散开 —— 靠人眼盯是盯不住的，新写一个页面很自然就又手写一遍。

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

const ADMIN_SRC = 'app/admin/src';
const files = walk(ADMIN_SRC).map((path) => ({ path, src: readFileSync(path, 'utf8') }));

/** 匹配单个 <Button ...>…</Button>（不跨嵌套）。 */
const BUTTON = /<Button\b(?:(?!<\/Button>|<Button\b).)*?(?:<\/Button>|\/>)/gs;

test('行内图标按钮不再手写颜色类，一律走 RowAction', () => {
  const offenders: string[] = [];
  for (const { path, src } of files) {
    if (path.includes('row-actions.tsx')) continue;  // 组件自己要写颜色
    for (const match of src.match(BUTTON) || []) {
      const isRowIcon = /size="icon(-sm|-xs)?"/.test(match) && /variant="ghost"/.test(match);
      const handWrittenColor = /hover:text-(destructive|primary|emerald|amber)/.test(match);
      if (isRowIcon && handWrittenColor) {
        offenders.push(`${path.replace(ADMIN_SRC + '/', '')}: ${match.replace(/\s+/g, ' ').slice(0, 90)}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});

test('RowAction 的色调档位齐全，且删除必须是 danger', () => {
  const src = readFileSync(join(ADMIN_SRC, 'components/ui/row-actions.tsx'), 'utf8');
  for (const tone of ['default', 'danger', 'success', 'warning', 'muted']) {
    expect(src).toContain(`${tone}:`);
  }
  // 平时灰、hover 才显语义色：一行并排四五个按钮，全彩会让整张表看不清内容
  expect(src).toContain("danger: 'text-muted-foreground hover:text-destructive");
  // 预设里删除固定 danger，别让调用方自己挑
  expect(src).toContain("delete: { icon: Trash2, tone: 'danger' as const }");
});

test('删除类操作都标了 danger —— 破坏性动作不能是默认色', () => {
  const wrong: string[] = [];
  for (const { path, src } of files) {
    if (path.includes('row-actions.tsx')) continue;
    // <RowAction ... icon={Trash2} ... /> 必须带 tone="danger"
    for (const match of src.match(/<RowAction\b[^>]*\/>/gs) || []) {
      if (/icon=\{Trash2\}/.test(match) && !/tone="danger"/.test(match)) {
        wrong.push(`${path.replace(ADMIN_SRC + '/', '')}: ${match.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }
  }
  expect(wrong).toEqual([]);
});

test('RowAction 的 onClick 收得下 event —— 可点击卡片里要 stopPropagation', () => {
  const src = readFileSync(join(ADMIN_SRC, 'components/ui/row-actions.tsx'), 'utf8');
  expect(src).toContain('onClick?: (event: MouseEvent<HTMLButtonElement>) => void');
  // Playlists 的卡片整体可点，两个按钮必须能阻止冒泡
  const playlists = readFileSync(join(ADMIN_SRC, 'pages/Playlists.tsx'), 'utf8');
  expect(playlists).toContain('e.stopPropagation()');
});

test('每个 RowAction 都有 title —— 纯图标按钮没有标签等于没有无障碍', () => {
  const missing: string[] = [];
  for (const { path, src } of files) {
    for (const match of src.match(/<RowAction\b[^>]*\/>/gs) || []) {
      if (!/title=/.test(match)) {
        missing.push(`${path.replace(ADMIN_SRC + '/', '')}: ${match.replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }
  }
  expect(missing).toEqual([]);
});
