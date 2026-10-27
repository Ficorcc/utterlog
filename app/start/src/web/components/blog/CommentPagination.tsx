'use client';

import type { CSSProperties } from 'react';
import { useThemeContext } from '@/lib/theme-context';

export default function CommentPagination({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { theme } = useThemeContext();
  if (totalPages <= 1) return null;

  const numbers = [...new Set([1, page - 1, page, page + 1, totalPages]
    .filter((value) => value >= 1 && value <= totalPages))].sort((a, b) => a - b);
  const items: (number | string)[] = [];
  numbers.forEach((number, index) => {
    const previous = numbers[index - 1];
    if (previous && number - previous === 2) items.push(previous + 1);
    if (previous && number - previous > 2) items.push(`gap-${previous}`);
    items.push(number);
  });

  const buttonStyle = (active = false, disabled = false): CSSProperties => ({
    minWidth: 34,
    minHeight: 34,
    padding: '5px 10px',
    border: '1px solid var(--color-border, #ddd)',
    borderRadius: theme.name === 'Azure' ? 0 : 10,
    background: active ? 'var(--color-primary, #0052d9)' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-main, #222)',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  });

  return (
    <nav className="comment-pagination" aria-label="评论分页" style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
      gap: 7, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border, #ddd)',
    }}>
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={buttonStyle(false, page <= 1)}>上一页</button>
      {items.map((item) => typeof item === 'number' ? (
        <button key={item} type="button" aria-label={`第 ${item} 页`} aria-current={item === page ? 'page' : undefined}
          onClick={() => onPageChange(item)} style={buttonStyle(item === page)}>{item}</button>
      ) : <span key={item} aria-hidden="true" style={{ padding: '0 3px', color: 'var(--color-text-sub, #777)' }}>…</span>)}
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={buttonStyle(false, page >= totalPages)}>下一页</button>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} style={buttonStyle(false, page >= totalPages)}>最后一页</button>
    </nav>
  );
}
