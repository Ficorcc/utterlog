
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variantStyles: Record<string, { bg: string; color: string }> = {
  default: { bg: 'var(--color-bg-soft)', color: 'var(--color-text-sub)' },
  success: { bg: 'var(--color-success-bg)', color: 'var(--color-success-text)' },
  warning: { bg: '#fffbeb', color: '#92400e' },
  error: { bg: 'var(--color-error-bg)', color: 'var(--color-error-text)' },
  info: { bg: 'var(--color-bg-soft)', color: 'var(--color-primary)' },
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '3px',
      fontSize: '12px', fontWeight: 500,
      backgroundColor: s.bg, color: s.color,
    }}>
      {children}
    </span>
  );
}
