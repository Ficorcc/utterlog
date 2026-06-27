
import { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, style, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="text-sub" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className="input focus-ring"
          style={{
            borderColor: error ? 'var(--color-error)' : undefined,
            ...style,
          }}
          {...props}
        />
        {error && <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--color-error)' }}>{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export { Textarea };
