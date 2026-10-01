'use client';

import { useEffect } from 'react';
import { useThemeContext } from '@/lib/theme-context';

const SCRIPT_ID = 'shanying-jieqi-widget';
const SCRIPT_SRC = 'https://api.jieqi.dev/v1/widget.js';

declare global {
  interface Window {
    Jieqi?: {
      start: () => void;
      destroy: () => void;
    };
  }
}

/**
 * WordPress ShanYing loads jieqi.dev in popup + stamp mode after the page is
 * idle. Keep that behavior here so holiday copy, lunar dates, make-up workdays
 * and illustrations continue to follow the upstream calendar automatically.
 */
export default function JieqiNotice() {
  const { options } = useThemeContext();
  const enabled = options.shanying_jieqi_enabled !== 'false';

  useEffect(() => {
    if (!enabled) {
      window.Jieqi?.destroy();
      document.getElementById(SCRIPT_ID)?.remove();
      return;
    }

    let cancelled = false;
    const start = () => {
      if (!cancelled) window.Jieqi?.start();
    };
    const load = () => {
      if (window.Jieqi) {
        start();
        return;
      }
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', start, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.defer = true;
      script.dataset.mode = 'popup';
      script.dataset.style = 'stamp';
      script.addEventListener('load', start, { once: true });
      document.head.append(script);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleId: number | undefined;
    let timerId: ReturnType<typeof globalThis.setTimeout> | undefined;
    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(load, { timeout: 4000 });
    } else {
      timerId = globalThis.setTimeout(load, 1);
    }
    return () => {
      cancelled = true;
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timerId !== undefined) globalThis.clearTimeout(timerId);
    };
  }, [enabled]);

  return null;
}
