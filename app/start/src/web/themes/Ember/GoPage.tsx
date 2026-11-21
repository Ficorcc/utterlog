'use client';

import { useThemeContext } from '@/lib/theme-context';

/**
 * 外链跳转确认页（/go）。
 *
 * 应用层默认的版本用的是另一套主题的类名，切到本主题后整页会退化成
 * 无样式的裸文本。这里按本主题的卡片与标题条结构重写一份：
 *   .ember-go
 *     .page-detail.ember-go-card   卡片（复用上游卡片样式）
 *       .activity-title-mark        竖线 + 图标 + GO / 外链跳转
 *       h1.ember-go-title           标题
 *       .ember-go-target            目标域名与完整地址
 *       .ember-go-actions           继续访问 / 返回
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
  const siteTitle = site?.title || '本站';
  const remain = Math.max(0, Math.min(countdown, countdownTotal));
  const progress = countdownTotal > 0 ? (remain / countdownTotal) * 100 : 0;

  return (
    <div className="ember-go">
      <section className="page-detail ember-go-card">
        <div className="activity-title-mark">
          <span aria-hidden="true" />
          <i
            className={confirmed ? 'fa-solid fa-arrow-up-right-from-square' : 'fa-regular fa-circle-question'}
            aria-hidden="true"
          />
          <b>GO</b>
          <em>外链跳转</em>
        </div>

        <h1 className="ember-go-title">
          {confirmed ? `即将离开 ${siteTitle}` : !target ? '链接无效' : '正在前往站内页面…'}
        </h1>

        {confirmed && target ? (
          <>
            <p className="ember-go-text">
              你即将访问外部网站，请核对下面的目标地址，谨防钓鱼与诈骗信息。
            </p>

            <div className="ember-go-target">
              <span className="ember-go-target-label">
                <i className="fa-solid fa-link" aria-hidden="true" /> 目标站点
              </span>
              <strong className="ember-go-host">{target.hostname}</strong>
              <code className="ember-go-url" dir="ltr">
                {target.href}
              </code>
            </div>

            {countdown > 0 ? (
              <div className="ember-go-progress" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
            ) : null}

            <div className="ember-go-actions">
              <button type="button" className="ember-go-btn ember-go-btn-primary" onClick={onConfirm}>
                继续访问{countdown > 0 ? `（${countdown} 秒）` : ''}
              </button>
              <button type="button" className="ember-go-btn" onClick={onBack}>
                返回
              </button>
            </div>

            <p className="ember-go-tip">
              <i className="fa-solid fa-shield-halved" aria-hidden="true" />
              本站不会收集你在外部网站上的任何信息。
            </p>
          </>
        ) : !target ? (
          <>
            <p className="ember-go-text">缺少有效的跳转地址，仅支持 http/https 外链。</p>
            <div className="ember-go-actions">
              <button type="button" className="ember-go-btn ember-go-btn-primary" onClick={onBack}>
                返回本站
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
