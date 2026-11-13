import { useEffect, useMemo, useState, type CSSProperties } from 'react';

/**
 * 评论者头像：按后端给的候选链依次尝试，全挂了才退回「昵称首字」占位。
 *
 * 与前台 app/start/src/web/components/CommentAvatar.tsx 是同一套逻辑，
 * 只是两个应用各打包一份（后台 SPA 不引前台包）。
 * 候选链顺序由后端 services/avatar.ts 决定，前端不关心平台是谁。
 */

const PLACEHOLDER_COLORS = ['#4a9e8e', '#c4956a', '#8b7ec8', '#d4837a', '#6b9dbd'];

interface Props {
  name?: string;
  candidates?: string[] | null;
  src?: string | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

export default function CommentAvatar({
  name = '',
  candidates,
  src,
  size = 32,
  className = '',
  style,
  alt = '',
}: Props) {
  const chain = useMemo(() => {
    const out: string[] = [];
    for (const url of [...(candidates || []), ...(src ? [src] : [])]) {
      const u = String(url || '').trim();
      if (u && !out.includes(u)) out.push(u);
    }
    return out;
  }, [candidates, src]);

  // 用字符串做依赖：父组件每次渲染都会新建数组对象
  const chainKey = chain.join('|');
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); }, [chainKey]);

  const current = chain[step];
  const label = String(name || '?').trim();

  if (!current) {
    return (
      <span
        className={className}
        title={label}
        style={{
          width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, lineHeight: 1, background: PLACEHOLDER_COLORS[label.length % 5],
          color: '#fff', fontSize: Math.max(11, Math.round(size * 0.4)), fontWeight: 700,
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
      style={{ width: size, height: size, objectFit: 'cover', flexShrink: 0, background: 'var(--muted, #f0f0f0)', ...style }}
    />
  );
}
