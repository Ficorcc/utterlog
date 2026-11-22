'use client';

import { Fragment, useMemo } from 'react';
import { useThemeContext } from '@/lib/theme-context';
import { dateLabel, externalHost, shortDateLabel } from './utils';

/**
 * 说说页：按时间倒序铺开说说，月份变化时插一条月份标题。
 *
 *   header.page-heading.glaze-panel
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *   div.talk-timeline
 *     h2.talk-month                       月份变化时插入
 *     article#note-{id}.talk-item
 *       a.talk-date.squircle > time
 *       div.talk-card.squircle
 *         h3（标题与正文不同时）
 *         正文段落
 *         div.talk-images > a.squircle > img
 *         a.talk-external.squircle[rel=external] > span.glaze-icon + span（域名）
 */

/** 站内同源链接直接跳转，其余外链统一走外链确认页 */
function externalHref(url: string, siteUrl: string): string {
  const raw = String(url || '').trim();
  if (!raw) return '/';
  if (raw.startsWith('/') || raw.startsWith('#')) return raw;
  try {
    const target = new URL(raw);
    if (siteUrl) {
      try {
        if (target.hostname === new URL(siteUrl).hostname) return raw;
      } catch {
        /* 站点地址不可解析时按外链处理 */
      }
    }
  } catch {
    return raw;
  }
  return `/go?url=${encodeURIComponent(raw)}`;
}

/** 时间戳 → ISO 字符串，供 <time dateTime> 使用 */
function isoTime(value: any): string {
  const num = Number(value);
  if (num > 0) {
    const date = new Date(num > 1e12 ? num : num * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const text = String(value || '').trim();
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** images 可能是数组，也可能是 JSON / 逗号分隔的字符串 */
function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    } catch {
      /* 落到下面的解析 */
    }
  }
  if (text.startsWith('{') && text.endsWith('}')) {
    return text
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }
  return text.split(',').map((item) => item.trim()).filter((item) => item.startsWith('http'));
}

export default function MomentsPage({ initialMoments = [] }: { initialMoments?: any[] }) {
  const { site, timeZone } = useThemeContext();
  const siteUrl = String(site?.url || '');

  const moments = useMemo(() => {
    const list = Array.isArray(initialMoments) ? initialMoments : [];
    return [...list].sort((a: any, b: any) => Number(b?.created_at || 0) - Number(a?.created_at || 0));
  }, [initialMoments]);

  return (
    <div className="glaze-moments">
      <header className="page-heading glaze-panel">
        <h1 className="glaze-page-title">
          <span className="glaze-page-title-icon squircle" aria-hidden="true">
            <span className="glaze-icon" data-glaze-icon="talks" />
          </span>
          <span>说说</span>
        </h1>
        <p className="archive-description">共 {moments.length} 条</p>
      </header>

      {moments.length === 0 ? (
        <div className="empty-state glaze-panel">
          <p>还没有说说</p>
        </div>
      ) : (
        <div className="talk-timeline">
          {moments.map((moment: any, index: number) => {
            const id = Number(moment?.id || 0);
            const createdAt = moment?.created_at;
            const content = String(moment?.content || '').trim();
            const title = String(moment?.title || '').trim();
            const images = parseImages(moment?.images);
            const link = String(moment?.link || moment?.url || moment?.source_url || '').trim();
            const host = externalHost(link);
            const monthKey = dateLabel(createdAt, timeZone).slice(0, 7);
            const prevMonthKey = index > 0 ? dateLabel(moments[index - 1]?.created_at, timeZone).slice(0, 7) : '';
            const paragraphs = content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);

            return (
              <Fragment key={id || `${createdAt}-${index}`}>
                {monthKey && monthKey !== prevMonthKey ? (
                  <h2 className="talk-month">{monthTitle(monthKey)}</h2>
                ) : null}
                <article className="talk-item" id={`note-${id}`}>
                  <a className="talk-date squircle" href={`#note-${id}`}>
                    <time dateTime={isoTime(createdAt)}>{shortDateLabel(createdAt, timeZone)}</time>
                  </a>
                  <div className="talk-card squircle">
                    {title && title !== content ? <h3>{title}</h3> : null}
                    {paragraphs.map((paragraph, index2) => (
                      <p key={index2}>{paragraph}</p>
                    ))}
                    {images.length ? (
                      <div className="talk-images">
                        {images.map((url) => (
                          <a className="squircle" key={url} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" loading="lazy" decoding="async" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {link ? (
                      <a
                        className="talk-external squircle"
                        href={externalHref(link, siteUrl)}
                        target="_blank"
                        rel="external noopener noreferrer"
                      >
                        <span className="glaze-icon" data-glaze-icon="links" aria-hidden="true" />
                        <span>{host || link}</span>
                      </a>
                    ) : null}
                  </div>
                </article>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 「2026-11」 → 「2026年11月」 */
function monthTitle(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  if (!year || !month) return monthKey;
  return `${year}年${Number(month)}月`;
}
