import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate, useMatch } from '@tanstack/react-router';
import { StartThemeShell } from '../components/StartThemeShell';
import type { ThemeContextData } from '@/lib/theme-context';

export const Route = createFileRoute('/go')({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === 'string' ? search.url : '',
  }),
  component: GoConfirmPage,
});

function parseTarget(raw: string) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function GoConfirmPage() {
  const { url } = Route.useSearch();
  const navigate = useNavigate();
  // 主题外壳与站点信息直接复用根路由的文档上下文，无需再发一次请求。
  const rootMatch = useMatch({ from: '__root__' });
  const ctx = rootMatch.loaderData as ThemeContextData | null;
  const [countdown, setCountdown] = useState(8);

  const target = useMemo(() => parseTarget(url), [url]);

  // 本站域名（含子域）放行，不弹确认页
  const isInternal = useMemo(() => {
    if (!target) return false;
    let siteHost = '';
    try {
      siteHost = new URL(ctx?.site.url || '', window.location.origin).hostname;
    } catch {}
    const host = window.location.hostname;
    return (
      target.hostname === host ||
      (!!siteHost && (target.hostname === siteHost || target.hostname.endsWith(`.${siteHost}`))) ||
      target.hostname.endsWith(`.${host}`)
    );
  }, [target, ctx?.site.url]);

  useEffect(() => {
    if (target && isInternal) window.location.replace(target.href);
  }, [target, isInternal]);

  useEffect(() => {
    if (!target || isInternal) return;
    const timer = window.setInterval(() => {
      setCountdown(value => {
        if (value <= 1) {
          window.clearInterval(timer);
          window.location.assign(target.href);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [target, isInternal]);

  const back = () => {
    if (window.history.length > 1) window.history.back();
    else navigate({ to: '/' });
  };

  const confirmed = !!target && !isInternal;

  if (!ctx) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p>正在加载…</p>
      </main>
    );
  }

  return (
    <StartThemeShell ctx={ctx}>
      <div className="sy-go-wrap">
        <div className="sy-go-card">
          <span className="sy-go-icon" aria-hidden="true">
            <i className={confirmed ? 'fa-solid fa-paper-plane' : 'fa-regular fa-circle-question'} />
          </span>
          <h1 className="sy-go-title">
            {confirmed ? `即将离开 ${ctx.site.title || '本站'}` : !target ? '链接无效' : '正在前往站内页面…'}
          </h1>
          {confirmed ? (
            <>
              <p className="sy-go-text">
                你即将访问外部网站，请注意核对目标地址，谨防钓鱼与诈骗信息。
              </p>
              <p className="sy-go-domain">{target!.hostname}</p>
              <p className="sy-go-url" dir="ltr">{target!.href}</p>
              <div className="sy-go-actions">
                <button type="button" className="sy-go-btn sy-go-primary" onClick={() => window.location.assign(target!.href)}>
                  继续访问{countdown > 0 ? `（${countdown} 秒）` : ''}
                </button>
                <button type="button" className="sy-go-btn" onClick={back}>返回</button>
              </div>
            </>
          ) : !target ? (
            <>
              <p className="sy-go-text">缺少有效的跳转地址，仅支持 http/https 外链。</p>
              <div className="sy-go-actions">
                <button type="button" className="sy-go-btn" onClick={back}>返回</button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </StartThemeShell>
  );
}
