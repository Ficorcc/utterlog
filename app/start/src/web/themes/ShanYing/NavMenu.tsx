'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from '@/components/AppLink';
import type { MenuItem } from '@/lib/theme-context';

export function MenuTree({ items, close }: { items: MenuItem[]; close: () => void }) {
  return <ul className="sy-menu-tree">{items.map((item, index) => <li key={`${index}-${item.href}`}>
    {item.children?.length ? <details>
      <summary>{item.label}</summary>
      {item.href && item.href !== '#' && <Link href={item.href} target={item.target} onClick={close}>打开{item.label}</Link>}
      <MenuTree items={item.children} close={close} />
    </details> : <Link href={item.href || '#'} target={item.target} onClick={close}>{item.label}</Link>}
  </li>)}</ul>;
}

export default function NavMenu({ item, active, highlight }: {
  item: MenuItem; active: boolean; highlight: (element: HTMLElement) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const id = useId();
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  const close = () => { cancel(); setPosition(null); };
  const open = (focus = false) => {
    cancel();
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    setPosition({ left: Math.max(12, Math.min(box.left, window.innerWidth - 252)), top: box.bottom + 6 });
    if (focus) requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('a, summary')?.focus());
  };
  const leave = () => { cancel(); timer.current = setTimeout(close, 180); };
  useEffect(() => () => cancel(), []);
  useEffect(() => {
    if (!position) return;
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { close(); toggle.current?.focus(); } };
    const scroll = (event: Event) => { if (!panel.current?.contains(event.target as Node)) close(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', close);
    };
  }, [position]);
  return <div ref={root} className="sy-nav-branch" onPointerEnter={event => { if (event.pointerType === 'mouse') open(); }} onPointerLeave={leave}>
    {item.href && item.href !== '#' && <Link href={item.href} target={item.target} className={`sy-nav-link${active ? ' is-active' : ''}`} onMouseEnter={event => highlight(event.currentTarget)} onFocus={event => highlight(event.currentTarget)}>{item.label}</Link>}
    <button ref={toggle} type="button" className="sy-nav-link sy-submenu-toggle" aria-label={`展开${item.label}子菜单`} aria-expanded={!!position} aria-controls={id}
      onClick={() => position ? close() : open(true)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); open(true); } }}>
      {(!item.href || item.href === '#') && item.label}<span aria-hidden="true">⌄</span>
    </button>
    {position && createPortal(<div ref={panel} id={id} className="sy-nav-dropdown" style={{ ...position, maxHeight: `calc(100dvh - ${position.top + 12}px)` }} onPointerEnter={cancel} onPointerLeave={leave} aria-label={`${item.label}子菜单`}>
      <MenuTree items={item.children || []} close={close} />
    </div>, document.body)}
  </div>;
}
