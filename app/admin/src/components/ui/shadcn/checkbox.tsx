import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 原生 checkbox 的样式收口。
 *
 * 站内曾有 14 处各自手写 `size-4 accent-primary` 那串 class，尺寸和 cursor
 * 有的写有的漏。基线放在这里，调用处只在需要垂直对齐微调时传 mt-* 之类。
 *
 * 没有换成 Base UI 的 Checkbox：原生 input 在表格全选、表单里都够用，
 * 换掉要动全部调用点的受控写法，收益不抵风险。
 */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn('size-4 shrink-0 cursor-pointer accent-primary', className)}
    {...props}
  />
));

Checkbox.displayName = 'Checkbox';
