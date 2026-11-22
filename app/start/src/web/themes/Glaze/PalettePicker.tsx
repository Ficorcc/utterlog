'use client';

import { useEffect, useState } from 'react';
import { GLAZE_PALETTES } from './utils';

/**
 * 配色 / 深浅色切换器。
 *
 * 上游把切换器放在页脚（details.palette-picker），配色写入根元素的
 * data-glaze-palette，深浅色写入 data-glaze-scheme，并各自记忆到 localStorage。
 */
export default function PalettePicker() {
  const [palette, setPalette] = useState('green');
  const [scheme, setScheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    setPalette(root.getAttribute('data-glaze-palette') || 'green');
    setScheme(root.getAttribute('data-glaze-scheme') || 'light');
  }, []);

  const applyPalette = (key: string) => {
    setPalette(key);
    document.documentElement.setAttribute('data-glaze-palette', key);
    try {
      localStorage.setItem('glaze-palette', key);
    } catch {
      /* 隐私模式下写不进去，忽略即可 */
    }
  };

  const toggleScheme = () => {
    const next = scheme === 'dark' ? 'light' : 'dark';
    setScheme(next);
    document.documentElement.setAttribute('data-glaze-scheme', next);
    try {
      localStorage.setItem('glaze-scheme', next);
    } catch {
      /* 同上 */
    }
  };

  return (
    <details className="palette-picker" data-glaze-palette-picker>
      <summary className="footer-control squircle" aria-label="主题配色" aria-controls="glaze-palette-panel">
        <span className="palette-dot" aria-hidden="true" />
      </summary>
      <div className="palette-panel glaze-panel t-dropdown" id="glaze-palette-panel" data-origin="bottom-right">
        <div className="palette-grid squircle" role="group" aria-label="主题配色">
          {GLAZE_PALETTES.map((item) => (
            <div className="palette-option" key={item.key}>
              <button
                type="button"
                className="palette-swatch-button squircle"
                data-glaze-swatch={item.key}
                aria-label={item.label}
                aria-pressed={palette === item.key}
                onClick={() => applyPalette(item.key)}
              >
                <span className="palette-swatch squircle" aria-hidden="true" />
              </button>
              <span aria-hidden="true">{item.label}</span>
            </div>
          ))}
          <div className="palette-option">
            <button
              type="button"
              className="palette-swatch-button palette-scheme-toggle squircle"
              data-glaze-theme-toggle
              aria-label={scheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              aria-pressed={scheme === 'dark'}
              onClick={toggleScheme}
            >
              <span className="palette-swatch palette-scheme-swatch squircle" aria-hidden="true">
                <svg className="theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
                </svg>
                <svg className="theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15.1A9 9 0 0 1 8.9 3a9.15 9.15 0 1 0 12.1 12.1Z" />
                </svg>
              </span>
            </button>
            <span aria-hidden="true">深色</span>
          </div>
        </div>
      </div>
    </details>
  );
}
