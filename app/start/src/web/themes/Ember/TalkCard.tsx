'use client';

import { useState } from 'react';
import { momentsApi } from '@/lib/api';
import { useThemeContext } from '@/lib/theme-context';
import { postDateTimeLabel } from './utils';

function momentImages(moment: any): string[] {
  const raw = moment?.images;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((item) => typeof item === 'string' && item);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string' && item);
    } catch {
      /* 老数据可能是逗号分隔 */
    }
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

/** 正文里的 #话题 拆成上游的 .talk-inline-keywords 样式 */
function ContentWithTags({ content }: { content: string }) {
  const parts = String(content || '').split(/(#[\p{Letter}\p{Number}_-]{1,40})/gu);
  return (
    <>
      {parts.map((part, index) => (
        part.startsWith('#')
          ? <span key={index} className="talk-inline-keywords"><span>{part}</span></span>
          : <span key={index}>{part}</span>
      ))}
    </>
  );
}

export default function TalkCard({ moment }: { moment: any }) {
  const { timeZone, visitorWeather } = useThemeContext();
  const [likeCount, setLikeCount] = useState(Number(moment?.like_count || 0));
  const [liked, setLiked] = useState(Boolean(moment?.liked));
  const [busy, setBusy] = useState(false);

  const images = momentImages(moment);
  const location = String(moment?.location || '');
  const weatherText = visitorWeather?.temperature != null
    ? `${Math.round(Number(visitorWeather.temperature))}°C`
    : '';

  const toggleLike = async () => {
    const id = Number(moment?.id);
    if (!Number.isInteger(id) || busy) return;
    setBusy(true);
    try {
      const response: any = await momentsApi.toggleLike(id);
      const result = response?.data || response;
      setLiked(Boolean(result?.liked));
      setLikeCount(Number(result?.like_count || 0));
    } catch {
      /* 点赞失败保持原状 */
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="home-card home-card--talk home-talk-card" id={`talk-${moment.id}`}>
      {moment?.content ? (
        <div className="home-card-body talk-content">
          <ContentWithTags content={moment.content} />
        </div>
      ) : null}

      {images.length ? (
        <div className={`home-card-media talk-images talk-images-count-${Math.min(images.length, 10)}`}>
          {images.map((src) => (
            <img key={src} src={src} alt="" loading="lazy" decoding="async" />
          ))}
        </div>
      ) : null}

      <footer className="home-actions home-card-footer home-card-meta-bar">
        <div className="home-card-meta home-talk-meta">
          <span>
            <time className="time-tag" dateTime={String(moment?.created_at || '')}>{postDateTimeLabel(moment, timeZone)}</time>
          </span>
          {location ? (
            <span className="home-talk-location" title={location}>
              <i className="fa-solid fa-location-dot" aria-hidden="true" />{location}
            </span>
          ) : null}
          {weatherText ? (
            <span className="home-talk-weather">
              <i className="fa-solid fa-cloud-sun" aria-hidden="true" />{weatherText}
            </span>
          ) : null}
        </div>
        <div className="home-card-actions home-talk-side">
          <button
            type="button"
            className={`home-action talk-like-btn${liked ? ' liked' : ''}`}
            aria-label={liked ? '取消点赞' : '点赞'}
            aria-pressed={liked}
            onClick={toggleLike}
            disabled={busy}
          >
            <i className={liked ? 'fa-solid fa-thumbs-up' : 'fa-regular fa-thumbs-up'} aria-hidden="true" />
            <span className="like-count">{likeCount}</span>
          </button>
          <a className="home-action talk-comment-toggle" href={`/moments#moment-${moment.id}`} aria-label="评论数">
            <i className="fa-regular fa-comment" aria-hidden="true" />
            <span>{Number(moment?.comment_count || 0)}</span>
          </a>
        </div>
      </footer>
    </article>
  );
}
