
import { useRef, useCallback, useState, useEffect, useLayoutEffect, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import {
  ListChecks, List, Highlighter, Link, Image as ImageIcon, Code, Quote,
  ChevronDown, Download, Video, Music, BookOpen, Film, MessageCircle,
  Eye, Palette, FileCode, Table as TableIcon, FileInput, ExternalLink,
  CircleMinus, GitBranch, AtSign,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/* ── toolbar shortcut helpers ──
 * 工具栏按钮上都加了 onMouseDown preventDefault，所以理论上 textarea
 * 不会失焦。但 onChange → React 重渲染 textarea，浏览器在极少数情况
 * 下仍会重置 scrollTop；focus() 也可能自动滚动让光标可见。这里统一
 * 在 rAF 里恢复点击前的 scrollTop，并用 preventScroll 防止 focus 自滚。
 */
function wrap(
  ta: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void,
  placeholder = '',
) {
  const { selectionStart: s, selectionEnd: e, value, scrollTop } = ta;
  const sel = value.slice(s, e) || placeholder;
  const next = value.slice(0, s) + before + sel + after + value.slice(e);
  onChange(next);
  requestAnimationFrame(() => {
    ta.focus({ preventScroll: true });
    ta.selectionStart = s + before.length;
    ta.selectionEnd = s + before.length + sel.length;
    ta.scrollTop = scrollTop;
  });
}

function linePrefix(
  ta: HTMLTextAreaElement,
  prefix: string,
  onChange: (v: string) => void,
) {
  const { selectionStart: s, value, scrollTop } = ta;
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(next);
  requestAnimationFrame(() => {
    ta.focus({ preventScroll: true });
    ta.selectionStart = ta.selectionEnd = s + prefix.length;
    ta.scrollTop = scrollTop;
  });
}

/* ── toolbar button defs ── */
interface TBBtn {
  label: string;
  icon: React.ReactNode;
  action: (ta: HTMLTextAreaElement, onChange: (v: string) => void) => void;
}


const toolbar: TBBtn[] = [
  // H1-H6 handled separately as dropdown

  {
    label: '任务列表',
    icon: <ListChecks size={15} />,
    action: (ta, fn) => linePrefix(ta, '- [ ] ', fn),
  },
  {
    label: '列表',
    icon: <List size={14} />,
    action: (ta, fn) => linePrefix(ta, '- ', fn),
  },
  { label: 'sep', icon: null, action: () => {} },
  {
    label: '粗体',
    icon: <span className="text-xs-plus font-bold">B</span>,
    action: (ta, fn) => wrap(ta, '**', '**', fn, '粗体文本'),
  },
  {
    label: '斜体',
    icon: <span className="text-xs-plus italic">I</span>,
    action: (ta, fn) => wrap(ta, '*', '*', fn, '斜体文本'),
  },
  { label: 'color', icon: null, action: () => {} },
  {
    label: '荧光笔',
    icon: <Highlighter size={14} />,
    action: (ta, fn) => wrap(ta, '==', '==', fn, '高亮文本'),
  },
  { label: 'sep', icon: null, action: () => {} },
  {
    label: '链接',
    icon: <Link size={14} />,
    action: (ta, fn) => wrap(ta, '[', '](url)', fn, '链接文本'),
  },
  // Table handled separately as grid picker

  {
    label: '图片',
    icon: <ImageIcon size={14} />,
    action: (ta, fn) => wrap(ta, '![', '](url)', fn, 'alt'),
  },
  { label: 'sep', icon: null, action: () => {} },
  {
    label: '代码',
    icon: <Code size={14} />,
    action: (ta, fn) => wrap(ta, '`', '`', fn, 'code'),
  },
  // Code block handled separately as language picker

  {
    label: '引用',
    icon: <Quote size={13} />,
    action: (ta, fn) => linePrefix(ta, '> ', fn),
  },
  {
    label: '分割线',
    icon: <span className="text-xs" style={{ letterSpacing: '2px' }}>---</span>,
    action: (ta, fn) => {
      const { selectionStart: s, value, scrollTop } = ta;
      const next = value.slice(0, s) + '\n---\n' + value.slice(s);
      fn(next);
      requestAnimationFrame(() => {
        ta.focus({ preventScroll: true });
        ta.selectionStart = ta.selectionEnd = s + 5;
        ta.scrollTop = scrollTop;
      });
    },
  },
  { label: 'sep', icon: null, action: () => {} },
  {
    label: '折叠面板',
    icon: <ChevronDown size={13} />,
    action: (ta, fn) => {
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const sel = value.slice(s, e) || '这里填写折叠内容';
      const sc = `\n[collapse title="点击展开"]\n${sel}\n[/collapse]\n`;
      const next = value.slice(0, s) + sc + value.slice(e);
      fn(next);
    },
  },
  {
    label: '资源下载',
    icon: <Download size={13} />,
    action: (ta, fn) => {
      const { selectionStart: s, value } = ta;
      const sc = `\n[download title="资源下载" desc="填写资源简介或版本说明" url="https://"]\n`;
      const next = value.slice(0, s) + sc + value.slice(s);
      fn(next);
    },
  },
  {
    label: '视频',
    icon: <Video size={13} />,
    action: (ta, fn) => {
      const { selectionStart: s, value } = ta;
      const sc = `\n[video]https://example.com/video.mp4[/video]\n`;
      const next = value.slice(0, s) + sc + value.slice(s);
      fn(next);
    },
  },
  { label: 'sep', icon: null, action: () => {} },
  {
    label: '音乐',
    icon: <Music size={13} />,
    action: (ta, fn) => {
      const { selectionStart: s, value } = ta;
      const sc = `\n[music platform="netease" id="" title="" artist="" cover=""][/music]\n`;
      const next = value.slice(0, s) + sc + value.slice(s);
      fn(next);
    },
  },
  {
    label: '图书',
    icon: <BookOpen size={13} />,
    action: () => {},
  },
  {
    label: '电影',
    icon: <Film size={13} />,
    action: () => {},
  },
  {
    label: '说说',
    icon: <MessageCircle size={13} />,
    action: () => {},
  },
];

/* ── text stats ── */
function stripFencedCodeBlocks(text: string) {
  const out: string[] = [];
  let inFence = false;
  let fence = '';
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/^[ \t]+/, '');
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      const marker = trimmed.slice(0, 3);
      if (!inFence) {
        inFence = true;
        fence = marker;
      } else if (marker === fence) {
        inFence = false;
        fence = '';
      }
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out.join('\n');
}

function countReadableChars(text: string) {
  return Array.from(
    stripFencedCodeBlocks(text)
      .replace(/<script[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>|<pre[^>]*>[\s\S]*?<\/pre>|<code[^>]*>[\s\S]*?<\/code>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`[^`\n]+`/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\*\*|~~|__|[*_#>`|]/g, ''),
  ).filter(ch => !/\s/u.test(ch)).length;
}

function calcStats(text: string) {
  const chars = text.length;
  const words = countReadableChars(text);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length || 0;
  const readingTime = Math.max(1, Math.ceil(words / 400)); // ~400 CJK chars/min
  return { chars, words, paragraphs, readingTime };
}

const previewSanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(new Set([...(defaultSchema.tagNames || []), 'mark'])),
};

function renderableMarkdown(text: string) {
  return text.replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');
}

const githubRepoLinePattern = /(^|\n)[ \t]{0,3}(https?:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)(?:\/)?(?:[?#][^\s]*)?)[ \t]*(?=\n|$)/;
const xPostLinePattern = /(^|\n)[ \t]{0,3}(https?:\/\/(?:x\.com|twitter\.com|mobile\.twitter\.com)\/[^/\s]+\/status(?:es)?\/\d+(?:[/?#][^\s]*)?)[ \t]*(?=\n|$)/i;

function isInsideMarkdownFence(text: string, index: number) {
  let inFence = false;
  for (const line of text.slice(0, index).split('\n')) {
    if (/^(```|~~~)/.test(line.trimStart())) inFence = !inFence;
  }
  return inFence;
}

function ToolbarDropdown({
  open,
  anchorRef,
  onClose,
  children,
  minWidth = 120,
  maxHeight,
  width,
  className,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
  maxHeight?: number;
  width?: number;
  className?: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const resolvedWidth = width ?? minWidth;
    const left = Math.min(Math.max(rect.left, 8), Math.max(8, window.innerWidth - resolvedWidth - 8));
    setPos({ top: rect.bottom + 4, left });
  }, [anchorRef, minWidth, width]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onClose, open, updatePosition]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={cn('fixed z-[10000] bg-card border border-border shadow-lg', className)}
      style={{
        top: pos.top,
        left: pos.left,
        minWidth,
        maxHeight,
        width,
        overflowY: maxHeight ? 'auto' : undefined,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ── component ── */
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onImportMd?: () => void;
  onInsertContent?: (type: string) => void;
}

/* ── Shortcode renderer: splits content into markdown + shortcode blocks ── */
function ShortcodeRenderer({ content }: { content: string }) {
  // Split by shortcodes, render each part
  const parts: { type: 'md' | 'collapse' | 'download' | 'video' | 'moment' | 'github' | 'x'; content: string; attrs?: Record<string, string> }[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    // Find next shortcode
    const collapseMatch = remaining.match(/\[collapse\s+title="([^"]*)"?\]\n?([\s\S]*?)\[\/collapse\]/);
    const downloadMatch = remaining.match(/\[download\s+title="([^"]*)"\s+desc="([^"]*)"\s+url="([^"]*)"\]/);
    const videoMatch = remaining.match(/\[video\]([\s\S]*?)\[\/video\]/);
    const momentMatch = remaining.match(/\[moment\s+id=(?:"([^"]+)"|'([^']+)'|([^\]\s]+))\]\s*\[\/moment\]/);
    const rawGithubMatch = remaining.match(githubRepoLinePattern);
    const githubMatch = rawGithubMatch && !isInsideMarkdownFence(remaining, rawGithubMatch.index || 0) ? rawGithubMatch : null;
    const rawXPostMatch = remaining.match(xPostLinePattern);
    const xPostMatch = rawXPostMatch && !isInsideMarkdownFence(remaining, rawXPostMatch.index || 0) ? rawXPostMatch : null;

    const matches = [
      collapseMatch ? { m: collapseMatch, type: 'collapse' as const } : null,
      downloadMatch ? { m: downloadMatch, type: 'download' as const } : null,
      videoMatch ? { m: videoMatch, type: 'video' as const } : null,
      momentMatch ? { m: momentMatch, type: 'moment' as const } : null,
      githubMatch ? { m: githubMatch, type: 'github' as const } : null,
      xPostMatch ? { m: xPostMatch, type: 'x' as const } : null,
    ].filter(Boolean).sort((a, b) => (a!.m!.index || 0) - (b!.m!.index || 0));

    if (matches.length === 0) {
      parts.push({ type: 'md', content: remaining });
      break;
    }

    const first = matches[0]!;
    const idx = first.m!.index || 0;
    if (idx > 0) parts.push({ type: 'md', content: remaining.slice(0, idx) });

    if (first.type === 'collapse') {
      parts.push({ type: 'collapse', content: first.m![2], attrs: { title: first.m![1] } });
    } else if (first.type === 'download') {
      parts.push({ type: 'download', content: '', attrs: { title: first.m![1], desc: first.m![2], url: first.m![3] } });
    } else if (first.type === 'video') {
      parts.push({ type: 'video', content: first.m![1].trim() });
    } else if (first.type === 'moment') {
      parts.push({ type: 'moment', content: '', attrs: { id: first.m![1] || first.m![2] || first.m![3] || '' } });
    } else if (first.type === 'github') {
      const repo = String(first.m![4] || '').replace(/\.git$/i, '');
      parts.push({ type: 'github', content: '', attrs: { url: `https://github.com/${first.m![3]}/${repo}`, owner: first.m![3], repo } });
    } else if (first.type === 'x') {
      parts.push({ type: 'x', content: '', attrs: { url: first.m![2] || '' } });
    }

    remaining = remaining.slice(idx + first.m![0].length);
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'md') {
          return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, previewSanitizeSchema], rehypeHighlight, rehypeSlug]}>{renderableMarkdown(part.content)}</ReactMarkdown>;
        }
        if (part.type === 'collapse') {
          return (
            <details key={i} className="my-4 p-0" style={{ border: '1px solid var(--border)' }}>
              <summary className="py-3 px-4 text-sm font-medium" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CircleMinus size={16} />
                {part.attrs?.title || '点击展开'}
              </summary>
              <div className="py-3 px-4 text-sm" style={{ borderTop: '1px dashed var(--border)', lineHeight: 1.7 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, previewSanitizeSchema]]}>{renderableMarkdown(part.content)}</ReactMarkdown>
              </div>
            </details>
          );
        }
        if (part.type === 'download') {
          return (
            <div key={i} className="my-4 py-4 px-5 flex items-center gap-4 bg-download-icon text-white rounded-(--ctrl-radius)">
              <div className="size-11 flex items-center justify-center rounded-full bg-download-badge shrink-0">
                <Download size={18} className="text-download-icon" />
              </div>
              <div className="flex-1">
                <div className="text-sm-plus font-semibold">{part.attrs?.title || '资源下载'}</div>
                <div className="text-xs mt-0.5 opacity-70">{part.attrs?.desc || ''}</div>
              </div>
              <a href={part.attrs?.url || '#'} target="_blank" rel="noopener noreferrer" className="py-2 px-5 text-xs-plus font-semibold bg-download-badge text-download-icon no-underline shrink-0">
                立即下载体验
              </a>
            </div>
          );
        }
        if (part.type === 'video') {
          return (
            <div key={i} className="my-4">
              <video controls className="w-full bg-black max-h-100">
                <source src={part.content} />
              </video>
            </div>
          );
        }
        if (part.type === 'moment') {
          return (
            <aside key={i} className="utter-moment-embed utter-moment-embed--preview">
              <div className="utter-moment-embed__head">
                <span className="utter-moment-embed__icon"><MessageCircle size={14} /></span>
                <span className="utter-moment-embed__label">说说</span>
                <span className="utter-moment-embed__meta">#{part.attrs?.id || '?'}</span>
              </div>
              <div className="utter-moment-embed__content">保存后前台会自动读取这条说说。</div>
            </aside>
          );
        }
        if (part.type === 'github') {
          const fullName = `${part.attrs?.owner || ''}/${part.attrs?.repo || ''}`;
          return (
            <a key={i} className="github-repo-card" href={part.attrs?.url || '#'} target="_blank" rel="noopener noreferrer">
              <div className="github-repo-card__content">
                <div className="github-repo-card__kicker"><GitBranch size={13} />GitHub</div>
                <div className="github-repo-card__title">{fullName}</div>
                <p className="github-repo-card__desc">保存后前台会自动读取仓库描述、Star、Fork 和预览图。</p>
                <div className="github-repo-card__meta"><span>repo preview</span></div>
              </div>
              <div className="github-repo-card__visual" />
            </a>
          );
        }
        if (part.type === 'x') {
          return (
            <a key={i} className="x-post-embed__fallback" href={part.attrs?.url || '#'} target="_blank" rel="noopener noreferrer">
              <span><AtSign size={13} />X</span>
              <strong>保存后前台会显示 X 帖子长方形卡片</strong>
            </a>
          );
        }
        return null;
      })}
    </>
  );
}

/* ── Safe preview wrapper with error boundary ── */
class PreviewErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error('Preview render error:', e, info); }
  componentDidUpdate(prevProps: any) {
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return <p className="text-destructive text-xs">预览渲染出错：{this.state.error}</p>;
    }
    return this.props.children;
  }
}

function SafePreview({ value }: { value: string }) {
  return (
    <PreviewErrorBoundary>
      <ShortcodeRenderer content={value} />
    </PreviewErrorBoundary>
  );
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className = '',
  minHeight = '500px',
  onImportMd,
  onInsertContent,
}: MarkdownEditorProps) {
  const { t } = useI18n();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const headingBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const codeLangBtnRef = useRef<HTMLButtonElement>(null);
  const tableBtnRef = useRef<HTMLButtonElement>(null);
  const [showHeadings, setShowHeadings] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [tableHover, setTableHover] = useState({ r: 0, c: 0 });
  const [showCodeLang, setShowCodeLang] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const editorPlaceholder = placeholder ?? t('admin.editor.placeholder', '开始写作…');
  const toolbarLabel = (label: string) => ({
    '任务列表': t('admin.editor.toolbar.taskList', '任务列表'),
    '列表': t('admin.editor.toolbar.list', '列表'),
    '粗体': t('admin.editor.toolbar.bold', '粗体'),
    '斜体': t('admin.editor.toolbar.italic', '斜体'),
    '荧光笔': t('admin.editor.toolbar.highlight', '荧光笔'),
    '链接': t('admin.editor.toolbar.link', '链接'),
    '图片': t('admin.editor.toolbar.image', '图片'),
    '代码': t('admin.editor.toolbar.code', '代码'),
    '引用': t('admin.editor.toolbar.quote', '引用'),
    '分割线': t('admin.editor.toolbar.divider', '分割线'),
    '折叠面板': t('admin.editor.toolbar.collapse', '折叠面板'),
    '资源下载': t('admin.editor.toolbar.download', '资源下载'),
    '视频': t('admin.editor.toolbar.video', '视频'),
    '音乐': t('admin.content.music', '音乐'),
    '图书': t('admin.content.books', '图书'),
    '电影': t('admin.content.movies', '电影'),
    '说说': t('admin.pages.builtin.page_moments', '说说'),
  }[label] || label);

  const handleToolbar = useCallback(
    (btn: TBBtn) => {
      if (taRef.current) btn.action(taRef.current, onChange);
    },
    [onChange],
  );

  const closeDropdowns = useCallback(() => {
    setShowHeadings(false);
    setShowTable(false);
    setShowCodeLang(false);
    setShowColor(false);
    setTableHover({ r: 0, c: 0 });
  }, []);

  const toggleDropdown = useCallback((name: 'heading' | 'table' | 'code' | 'color') => {
    setShowHeadings(prev => (name === 'heading' ? !prev : false));
    setShowTable(prev => (name === 'table' ? !prev : false));
    setShowCodeLang(prev => (name === 'code' ? !prev : false));
    setShowColor(prev => (name === 'color' ? !prev : false));
    if (name !== 'table') setTableHover({ r: 0, c: 0 });
  }, []);

  /* Tab key → insert 2 spaces */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const { selectionStart: s, value: v } = ta;
        const next = v.slice(0, s) + '  ' + v.slice(s);
        onChange(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = s + 2;
        });
      }
    },
    [onChange],
  );

  return (
    // Root is the flex column host. `minHeight` lives ONLY here — passing
    // it further down (onto the body or textarea) forced both to be at
    // least as tall as the parent, which on top of the ~40px toolbar
    // overflowed the container by that amount. With `overflow: hidden`
    // up the chain that overflow was clipped at the bottom, swallowing
    // the textarea's last rows and its scrollbar → users reported
    // "can't scroll down" and "left content incomplete".
    <div
      className={`flex flex-col border border-border overflow-hidden bg-card ${className}`}
      style={{ minHeight }}
    >
      {/* Toolbar — flex-shrink: 0 keeps it from being squeezed when
          the body is tall; nowrap + overflow-x: auto means it always
          occupies exactly one row (predictable height, body calculations
          stay correct) and scrolls sideways on narrow viewports instead
          of wrapping into 2–3 rows that used to push the body down. */}
      <div className="py-1.5 px-4 bg-muted" style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0, flexWrap: 'nowrap',
        overflowX: 'auto', overflowY: 'visible',
        whiteSpace: 'nowrap',
      }}>
        <span className="text-xs text-muted-foreground mr-1.5" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Eye size={14} /> Markdown
        </span>
        {/* Heading dropdown */}
        <div>
          <button
            ref={headingBtnRef}
            type="button"
            title={t('admin.editor.toolbar.heading', '标题')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggleDropdown('heading')}
            className="py-1.5 px-2 bg-transparent text-muted-foreground text-xs-plus font-bold"
            style={{
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '2px',
            }}
          >
            H<span className="ml-px text-4xs">▾</span>
          </button>
          <ToolbarDropdown open={showHeadings} anchorRef={headingBtnRef} onClose={closeDropdowns} minWidth={80}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button key={n} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                  if (taRef.current) linePrefix(taRef.current, '#'.repeat(n) + ' ', onChange);
                  setShowHeadings(false);
                }} className="py-1.5 px-3 bg-transparent text-foreground font-semibold" style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  border: 'none', cursor: 'pointer',
                  fontSize: `${18 - n * 2}px`,
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  H{n}
                </button>
              ))}
          </ToolbarDropdown>
        </div>
        <span className="bg-border mx-1" style={{ width: '1px', height: '16px' }} />
        {toolbar.map((btn, idx) =>
          btn.label === 'sep' ? (
            <span key={`sep-${idx}`} className="bg-border mx-1" style={{ width: '1px', height: '16px' }} />
          ) : btn.label === 'color' ? (
            <div key="color">
              <button ref={colorBtnRef} type="button" title={t('admin.editor.toolbar.textColor', '字体颜色')} onMouseDown={(e) => e.preventDefault()} onClick={() => toggleDropdown('color')} className="py-1.5 px-2 bg-transparent text-muted-foreground" style={{
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}>
                <Palette size={14} />
              </button>
              <ToolbarDropdown
                open={showColor}
                anchorRef={colorBtnRef}
                onClose={closeDropdowns}
                minWidth={180}
                width={180}
                className="p-3"
              >
                  <p className="text-2xs text-muted-foreground mb-2">{t('admin.editor.chooseTextColor', '选择字体颜色')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {['#f43f5e', '#f97316', '#F59E0B', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#1a1a1a', '#6b7280'].map(color => (
                      <button key={color} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => {
                        if (taRef.current) {
                          wrap(taRef.current, `[color=${color}]`, '[/color]', onChange, '彩色文本');
                        }
                        setShowColor(false);
                      }} className="size-7 rounded-full border-2 border-white cursor-pointer ring-1 ring-black/10" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="mt-2" style={{ display: 'flex', gap: '4px' }}>
                    <input id="custom-color" type="color" defaultValue="#3b82f6" className="p-0 size-7 border-none cursor-pointer" />
                    <button type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => {
                      const el = document.getElementById('custom-color') as HTMLInputElement;
                      if (el && taRef.current) {
                        wrap(taRef.current, `[color=${el.value}]`, '[/color]', onChange, '彩色文本');
                      }
                      setShowColor(false);
                    }} className="text-2xs p-1 bg-muted text-foreground" style={{
                      flex: 1, border: '1px solid var(--border)', cursor: 'pointer',
                    }}>
                      {t('admin.editor.customColor', '自定义颜色')}
                    </button>
                  </div>
              </ToolbarDropdown>
            </div>
          ) : (
            <button
              key={btn.label}
              type="button"
              title={toolbarLabel(btn.label)}
              className="py-1.5 px-2 bg-transparent text-muted-foreground"
              style={{
                border: 'none', cursor: 'pointer',
                transition: 'color 0.15s',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const contentTypes = ['音乐', '图书', '电影', '说说'];
                if (contentTypes.includes(btn.label) && onInsertContent) {
                  onInsertContent(btn.label);
                } else {
                  handleToolbar(btn);
                }
              }}
            >
              {btn.icon}
            </button>
          )
        )}
        {/* Code block language picker */}
        <div>
          <button ref={codeLangBtnRef} type="button" title={t('admin.editor.toolbar.codeBlock', '代码块')} onMouseDown={(e) => e.preventDefault()} onClick={() => toggleDropdown('code')} className="py-1.5 px-2 bg-transparent text-muted-foreground" style={{
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <FileCode size={14} />
          </button>
          <ToolbarDropdown open={showCodeLang} anchorRef={codeLangBtnRef} onClose={closeDropdowns} minWidth={120} maxHeight={240}>
              {['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'php', 'ruby', 'swift', 'kotlin', 'c', 'cpp', 'csharp', 'html', 'css', 'scss', 'sql', 'bash', 'shell', 'json', 'yaml', 'toml', 'xml', 'markdown', 'diff', 'docker', 'nginx', 'lua', 'r', 'dart'].map(lang => (
                <button key={lang} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => {
                  if (taRef.current) {
                    const ta = taRef.current;
                    const { selectionStart: s, selectionEnd: e, value, scrollTop } = ta;
                    const sel = value.slice(s, e) || '';
                    const next = value.slice(0, s) + '```' + lang + '\n' + sel + '\n```' + value.slice(e);
                    onChange(next);
                    requestAnimationFrame(() => {
                      ta.focus({ preventScroll: true });
                      ta.selectionStart = ta.selectionEnd = s + 4 + lang.length + sel.length;
                      ta.scrollTop = scrollTop;
                    });
                  }
                  setShowCodeLang(false);
                }} className="py-1.5 px-3 bg-transparent text-xs text-foreground" style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {lang}
                </button>
              ))}
          </ToolbarDropdown>
        </div>
        {/* Table grid picker */}
        <div>
          <button ref={tableBtnRef} type="button" title={t('admin.editor.toolbar.table', '表格')} onMouseDown={(e) => e.preventDefault()} onClick={() => toggleDropdown('table')} className="py-1.5 px-2 bg-transparent text-muted-foreground" style={{
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <TableIcon size={14} />
          </button>
          <ToolbarDropdown open={showTable} anchorRef={tableBtnRef} onClose={closeDropdowns} minWidth={150} className="p-2">
              <p className="text-2xs text-muted-foreground mb-1.5">
                {tableHover.r > 0 ? `${tableHover.r} x ${tableHover.c}` : t('admin.editor.chooseTableSize', '选择表格大小')}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2px' }}>
                {Array.from({ length: 36 }, (_, i) => {
                  const r = Math.floor(i / 6) + 1;
                  const c = (i % 6) + 1;
                  const active = r <= tableHover.r && c <= tableHover.c;
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setTableHover({ r, c })}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        if (taRef.current) {
                          const ta = taRef.current;
                          const { selectionStart: s, value, scrollTop } = ta;
                          const header = '| ' + Array.from({ length: c }, (_, j) => t('admin.editor.tableColumn', '列{index}', { index: j + 1 })).join(' | ') + ' |';
                          const sep = '| ' + Array(c).fill('---').join(' | ') + ' |';
                          const rows = Array.from({ length: r }, () => '| ' + Array(c).fill('  ').join(' | ') + ' |').join('\n');
                          const table = `\n${header}\n${sep}\n${rows}\n`;
                          onChange(value.slice(0, s) + table + value.slice(s));
                          requestAnimationFrame(() => {
                            ta.focus({ preventScroll: true });
                            ta.selectionStart = ta.selectionEnd = s + table.length;
                            ta.scrollTop = scrollTop;
                          });
                        }
                        setShowTable(false);
                        setTableHover({ r: 0, c: 0 });
                      }}
                      className="size-4.5 border border-border cursor-pointer transition-colors"
                      style={{ background: active ? 'var(--primary)' : 'var(--muted)' }}
                    />
                  );
                })}
              </div>
          </ToolbarDropdown>
        </div>
        <span className="bg-border mx-1" style={{ width: '1px', height: '16px' }} />
        {onImportMd && (
          <button onClick={onImportMd} className="bg-transparent text-primary text-2xs py-1 px-1.5" style={{
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <FileInput size={13} /> {t('admin.editor.importMd', '导入 .md')}
          </button>
        )}
        <span className="ml-auto" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(() => { const s = calcStats(value); return (
            <span className="text-2xs text-muted-foreground" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{t('admin.editor.stats.words', '{count} 字', { count: s.words })}</span>
              <span>{t('admin.editor.stats.paragraphs', '{count} 段', { count: s.paragraphs })}</span>
              <span>{t('admin.editor.stats.minutes', '{count} 分钟', { count: s.readingTime })}</span>
            </span>
          ); })()}
          <span className="bg-border" style={{ width: '1px', height: '16px' }} />
          <a href="https://makeitdown.io" target="_blank" rel="noopener noreferrer" className="text-3xs text-muted-foreground" style={{
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.7,
          }}>
            MakeItDown <ExternalLink size={9} />
          </a>
          <span className="bg-border" style={{ width: '1px', height: '16px' }} />
          <span className="text-2xs text-muted-foreground">{t('admin.editor.preview', '预览')}</span>
          <span className="text-2xs text-muted-foreground" style={{ opacity: 0.6 }}>{t('admin.editor.synced', '已同步')}</span>
        </span>
      </div>

      {/* Editor body: left input + right preview.
          `min-height: 0` on every flex child is the modern incantation
          that lets a flex item shrink below its content's intrinsic
          size (flex's default min-size is `auto`, which refuses to
          shrink and causes exactly the "can't reach the bottom"
          behaviour we had). The textarea gets its own native scrollbar
          once content exceeds the column, and the preview pane's
          inner `overflowY: auto` handles its own scroll. */}
      <div className="flex flex-1" style={{ minHeight: 0 }}>
        {/* left: raw markdown */}
        <div className="flex-1 flex flex-col border-r border-border" style={{ minWidth: 0, minHeight: 0 }}>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editorPlaceholder}
            className="flex-1 w-full resize-none bg-transparent text-sm text-foreground font-mono leading-relaxed focus:outline-none placeholder:text-muted-foreground py-4 px-5"
            style={{ minHeight: 0, overflowY: 'auto' }}
            spellCheck={false}
          />
        </div>

        {/* right: preview */}
        <div className="flex-1 flex flex-col bg-muted" style={{ minWidth: 0, minHeight: 0 }}>
          <div
            style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
            className="blog-prose text-sm py-5 px-6"
          >
            {value ? (
              <SafePreview value={value} />
            ) : (
              <p className="text-muted-foreground italic">{t('admin.editor.previewPlaceholder', '预览区域，输入 Markdown 后实时渲染…')}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
