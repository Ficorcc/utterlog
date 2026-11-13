'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

/**
 * 评论者头像：按后端给的候选链依次尝试加载，全挂了才退回「昵称首字」占位。
 *
 * 候选链顺序（后端 services/avatar.ts 决定）：
 *   Utterlog 自带 → Cravatar → Weavatar → Libravatar → Loli.net → Gravatar
 *
 * 组件只负责「谁失败了换下一家」，不知道任何一家是谁 —— 平台地址与顺序
 * 都在后端，避免前后端两处各写一份、改一处漏一处。
 */

const PLACEHOLDER_COLORS = ['#4a9e8e', '#c4956a', '#8b7ec8', '#d4837a', '#6b9dbd'];

export interface CommentAvatarProps {
  /** 评论者昵称 —— 占位时取首字 */
  name?: string;
  /** 候选链，顺序即优先级 */
  candidates?: string[] | null;
  /** 兼容旧字段：单个头像地址，排在候选链之后 */
  src?: string | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  /** 圆形（头像）/ 圆角方形 */
  shape?: 'circle' | 'square';
}

export default function CommentAvatar({
  name = '',
  candidates,
  src,
  size = 40,
  className = '',
  style,
  alt = '',
  shape = 'circle',
}: CommentAvatarProps) {
  const chain = useMemo(() => {
    const out: string[] = [];
    for (const url of [...(candidates || []), ...(src ? [src] : [])]) {
      const u = String(url || '').trim();
      if (u && !out.includes(u)) out.push(u);
    }
    return out;
  }, [candidates, src]);

  // 用字符串做依赖：父组件每次渲染都会新建数组对象，用数组本身会一直重置
  const chainKey = chain.join('|');
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); }, [chainKey]);

  const current = chain[step];
  const label = String(name || '?').trim();
  const radius = shape === 'circle' ? '50%' : Math.max(4, Math.round(size * 0.22));

  if (!current) {
    return (
      <span
        className={className}
        title={label}
        style={{
          width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: radius, flexShrink: 0, lineHeight: 1,
          background: PLACEHOLDER_COLORS[label.length % 5],
          color: '#fff', fontSize: Math.max(11, Math.round(size * 0.42)), fontWeight: 700,
          ...style,
        }}
      >{(label[0] || '?').toUpperCase()}</span>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      title={alt || undefined}
      loading="lazy"
      decoding="async"
      onError={() => setStep((s) => s + 1)}
      className={className}
      style={{
        width: size, height: size, objectFit: 'cover', borderRadius: radius,
        flexShrink: 0, background: '#f0f0f0', ...style,
      }}
    />
  );
}
