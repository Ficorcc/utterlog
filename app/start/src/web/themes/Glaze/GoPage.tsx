'use client';

import { useEffect, useRef, useState } from 'react';
import { useThemeContext } from '@/lib/theme-context';

/**
 * 外链跳转确认页（/go）。
 *
 *   section.page-heading.glaze-panel.error-page.glaze-go
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *     p（提示文案）
 *     p.glaze-go-host（目标域名）
 *     p.glaze-go-countdown（倒计时 / 已跳转）
 *     div.glaze-go-actions
 *       button.control-button（继续访问）
 *       a.control-button[href=/]（返回）
 *
 * 倒计时用 useEffect + setInterval 实现，组件卸载时清理；归零后自动 onConfirm。
 */
export default function GoPage({
  target,
  countdown,
  countdownTotal = 8,
  confirmed,
  onConfirm,
  onBack,
}: {
  target: URL | null;
  countdown: number;
  countdownTotal?: number;
  confirmed: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const { site } = useThemeContext();
  const siteTitle = String(site?.title || '本站');
  const total = Math.max(0, Number(countdownTotal) || 0);
  const [remaining, setRemaining] = useState(() => Math.max(0, Number(countdown) || 0));
  const jumpedRef = useRef(false);

  useEffect(() => {
    if (!confirmed) return;
    if (remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [confirmed, remaining]);

  useEffect(() => {
    if (!confirmed || remaining > 0 || jumpedRef.current) return;
    jumpedRef.current = true;
    onConfirm();
  }, [confirmed, remaining, onConfirm]);

  const host = target?.host || '';
  const href = target?.href || '';

  return (
    <section className="page-heading glaze-panel error-page glaze-go">
      <h1 className="glaze-page-title">
        <span className="glaze-page-title-icon squircle" aria-hidden="true">
          <span className="glaze-icon" data-glaze-icon="misc" />
        </span>
        <span>{confirmed ? (remaining > 0 ? '即将离开本站' : '已跳转') : '链接无效'}</span>
      </h1>

      {confirmed && target ? (
        <>
          <p>你即将访问外部网站，请核对下面的目标地址，谨防钓鱼与诈骗信息。</p>
          <p className="glaze-go-host">{host}</p>
          {href ? (
            <p className="glaze-go-url" dir="ltr">
              {href}
            </p>
          ) : null}
          <p className="glaze-go-countdown" role="status">
            {remaining > 0 ? `${remaining} 秒后自动跳转` : '已跳转'}
          </p>
          <div className="glaze-go-actions">
            <button type="button" className="control-button" onClick={onConfirm}>
              继续访问{remaining > 0 ? `（${remaining} 秒）` : ''}
            </button>
            <a
              className="control-button"
              href="/"
              onClick={(event) => {
                event.preventDefault();
                onBack();
              }}
            >
              返回{siteTitle}
            </a>
          </div>
          <p className="glaze-go-tip">本站不会收集你在外部网站上的任何信息。</p>
        </>
      ) : (
        <>
          <p>缺少有效的跳转地址，仅支持 http/https 外链。</p>
          <div className="glaze-go-actions">
            <a
              className="control-button"
              href="/"
              onClick={(event) => {
                event.preventDefault();
                onBack();
              }}
            >
              返回{siteTitle}
            </a>
          </div>
        </>
      )}
    </section>
  );
}
