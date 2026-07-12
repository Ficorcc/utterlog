'use client';

import { useEffect, type ScriptHTMLAttributes } from 'react';

type Props = ScriptHTMLAttributes<HTMLScriptElement> & {
  strategy?: string;
};

export default function Script({ strategy: _strategy, ...rest }: Props) {
  useEffect(() => {
    if (_strategy !== 'lazyOnload' || !rest.src) return;
    const src = String(rest.src);
    if (document.querySelector(`script[src="${CSS.escape(src)}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [_strategy, rest.src]);

  if (_strategy === 'lazyOnload') return null;
  return <script {...rest} />;
}
