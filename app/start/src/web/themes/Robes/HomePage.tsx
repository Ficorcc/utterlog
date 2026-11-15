'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from '@/components/AppLink';
import PostLink from '@/components/blog/PostLink';
import { useThemeContext } from '@/lib/theme-context';
import PostCard from './PostCard';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconCloudy,
  IconRain,
  IconSun,
  IconSunCloud,
  IconTime,
} from './Icons';
import { formatDate, pageHref, readMinutes, weatherInfo } from './utils';

interface HomePost {
  id: number;
  slug?: string;
  title?: string;
  excerpt?: string;
  cover_url?: string;
  view_count?: number;
  comment_count?: number;
  word_count?: number;
  published_at?: string | number | null;
  created_at?: string | number;
  categories?: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
}

interface HomeProps {
  posts: HomePost[];
  page: number;
  totalPages: number;
  categories?: unknown[];
  archiveStats?: { post_count?: number; comment_count?: number };
  latestMoment?: unknown;
  latestComments?: unknown;
  perPage?: number;
}

/** 首页顶部轮播：取有封面的文章，最多 5 篇。 */
const HERO_LIMIT = 5;

/** 封面轮播自动切换间隔（毫秒）。 */
const HERO_INTERVAL = 10000;

function WeatherIcon({ icon }: { icon: 'sun' | 'suncloud' | 'cloudy' | 'rain' }) {
  if (icon === 'sun') return <IconSun size={18} />;
  if (icon === 'suncloud') return <IconSunCloud size={18} />;
  if (icon === 'rain') return <IconRain size={18} />;
  return <IconCloudy size={18} />;
}

export default function HomePage({ posts, page, totalPages }: HomeProps) {
  const { visitorWeather } = useThemeContext();
  const list = Array.isArray(posts) ? posts : [];
  const total = Math.max(1, Number(totalPages) || 1);

  const featured = useMemo(() => {
    // 有封面就优先用封面文章做轮播；一篇封面都没有时退化成纯色 Hero，
    // 但列表依然展示（对应原主题的 hero-plain 形态）。
    const withCover = list.filter((post) => post?.cover_url);
    const pool = withCover.length ? withCover : list;
    return pool.slice(0, HERO_LIMIT);
  }, [list]);

  const hasCover = featured.some((post) => post?.cover_url);

  const [active, setActive] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<number | null>(null);

  /**
   * 右箭头上的进度环：每次换片后从 0 重新走一圈（对齐原站 home.v2.js 的 resetRing）。
   * 动画本身由 CSS 的 @property --hr-ring + conic-gradient 驱动，
   * 这里只负责在换片时把 .is-running 摘掉再挂上，逼浏览器重启动画。
   */
  const resetRing = useCallback(() => {
    const button = nextRef.current;
    if (!button) return;
    button.classList.remove('is-running');
    void button.offsetWidth;
    button.classList.add('is-running');
  }, []);

  /** 暂停：鼠标悬停 / 键盘聚焦时停住自动切换，同时把进度环定格。 */
  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    heroRef.current?.classList.add('is-paused');
  }, []);

  /** 继续：重新计时并让进度环从头走。 */
  const play = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    heroRef.current?.classList.remove('is-paused');
    resetRing();
    if (featured.length < 2) return;
    timerRef.current = window.setInterval(() => {
      setActive((value) => (value + 1) % featured.length);
    }, HERO_INTERVAL);
  }, [featured.length, resetRing]);

  useEffect(() => {
    play();
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [play]);

  // 换片（含自动与手动）后进度环重新计时。
  useEffect(() => {
    resetRing();
  }, [active, resetRing]);

  /** 手动切换到指定封面。 */
  const goTo = (index: number) => {
    if (featured.length < 2) return;
    setActive(((index % featured.length) + featured.length) % featured.length);
  };

  // 首页翻页后回到顶部。
  useEffect(() => {
    const feed = document.getElementById('feed');
    if (feed) feed.scrollTo({ top: 0 });
  }, [page]);

  const weather = weatherInfo(visitorWeather?.weather_code, visitorWeather?.is_day !== false);
  const temperature = visitorWeather?.temperature;
  const city = visitorWeather?.city || visitorWeather?.country || '';

  const current = featured[active];

  return (
    <>
      {list.length ? (
        <section
          className={hasCover ? 'hero hero-standard' : 'hero hero-standard hero-plain'}
          id="hero"
          ref={heroRef}
          onMouseEnter={stop}
          onMouseLeave={play}
          onFocus={stop}
        >
          <div className="hero-bgs" id="heroBgs">
            <div
              className="hero-bg-layer is-active"
              style={current?.cover_url ? { backgroundImage: `url("${current.cover_url}")` } : undefined}
            />
            <div className="hero-bg-layer" />
          </div>
          <div className="hero-scrim" />
          <div className="hero-content">
            <div className="hero-head">
              <div className="hero-weather" id="heroWeather">
                <span className="hw-row hw-row-sub">
                  <span className="hw-desc">{weather.desc}</span>
                  <span className="hw-meta">
                    {visitorWeather?.humidity != null ? `湿度 ${Math.round(Number(visitorWeather.humidity))}%` : ''}
                  </span>
                </span>
                <span className="hw-row hw-row-main">
                  <span className="hw-icon">
                    <WeatherIcon icon={weather.icon} />
                  </span>
                  <span className="hw-city">{city}</span>
                  <span className="hw-temp">
                    {temperature == null ? '--°' : `${Math.round(Number(temperature))}°`}
                  </span>
                </span>
              </div>
            </div>

            <div className="hero-feature" id="heroFeature" data-start={active}>
              <ul className="hero-feat-track">
                {featured.map((post, index) => (
                  <li
                    key={post.id}
                    className={index === active ? 'hero-feat is-active' : 'hero-feat'}
                    data-bg={post.cover_url ? `url("${post.cover_url}")` : undefined}
                  >
                    <PostLink post={post}>
                      <span className="hf-title">{post.title}</span>
                      <span className="hf-meta">
                        <span>
                          <IconCalendar size={12} />
                          {formatDate(post.published_at || post.created_at)}
                        </span>
                        <span>
                          <IconTime size={12} />
                          约 {readMinutes(post.word_count)} 分钟
                        </span>
                        {post.categories?.[0] ? <span className="hf-cat">{post.categories[0].name}</span> : null}
                      </span>
                    </PostLink>
                  </li>
                ))}
              </ul>
            </div>

            {featured.length > 1 ? (
              <div className="hero-foot">
                <div className="hero-progress">
                  <div className="hero-dots" id="heroDots">
                    {featured.map((post, index) => (
                      <button
                        key={post.id}
                        type="button"
                        className={index === active ? 'hero-dot is-active' : 'hero-dot'}
                        onClick={() => goTo(index)}
                        aria-label={`切换到第 ${index + 1} 篇`}
                      />
                    ))}
                  </div>
                  <span className="hero-count" id="heroCount">
                    <b>{String(active + 1).padStart(2, '0')}</b>
                    <i>/</i>
                    <b>{String(featured.length).padStart(2, '0')}</b>
                  </span>
                </div>
                <div className="hero-rec-ctrl">
                  <button
                    type="button"
                    className="hero-rec-nav"
                    onClick={() => {
                      goTo(active - 1);
                      play();
                    }}
                    aria-label="上一篇"
                  >
                    <IconArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="hero-rec-nav"
                    ref={nextRef}
                    onClick={() => {
                      goTo(active + 1);
                      play();
                    }}
                    aria-label="下一篇"
                  >
                    <IconArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {list.length ? (
        list.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <div className="post-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
          还没有发表文章
        </div>
      )}

      {total > 1 ? (
        <div className="pagination">
          <ol>
            {page > 1 ? (
              <li>
                <Link href={pageHref(page - 1)} rel="prev">
                  ← 上一页
                </Link>
              </li>
            ) : null}
            {Array.from({ length: total }).map((_, index) => {
              const target = index + 1;
              return (
                <li key={target} className={target === page ? 'current' : undefined}>
                  {target === page ? (
                    <span className="current">{target}</span>
                  ) : (
                    <Link href={pageHref(target)}>{target}</Link>
                  )}
                </li>
              );
            })}
            {page < total ? (
              <li>
                <Link href={pageHref(page + 1)} rel="next">
                  下一页 →
                </Link>
              </li>
            ) : null}
          </ol>
        </div>
      ) : null}
    </>
  );
}
