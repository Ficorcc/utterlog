'use client';

import { useMemo, useState } from 'react';
import { datePartsInTimeZone } from '@/lib/timezone';
import { useThemeContext } from '@/lib/theme-context';
import TalkCard from './TalkCard';

/**
 * 说说页：对照上游 pages/talk.php + inc/talk-card.php。
 *
 *   .talk-list
 *     .talk-hero                  标题 + 统计
 *     .talk-keyword-rail          按话题（mood）筛选
 *     .talk-filter-frame
 *       .js-list-items             说说列表（复用 TalkCard）
 */

export default function MomentsPage({ initialMoments = [] }: { initialMoments?: any[] }) {
  const { timeZone } = useThemeContext();
  const moments = Array.isArray(initialMoments) ? initialMoments : [];
  const [keyword, setKeyword] = useState('');

  const moods = useMemo(() => {
    const map = new Map<string, number>();
    for (const moment of moments) {
      const mood = String(moment?.mood || '').trim();
      if (mood) map.set(mood, (map.get(mood) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [moments]);

  const activeDays = useMemo(() => {
    const days = new Set<string>();
    for (const moment of moments) {
      const { year, month, day } = datePartsInTimeZone(moment?.created_at, timeZone);
      if (year && month && day) days.add(`${year}-${month}-${day}`);
    }
    return days.size;
  }, [moments, timeZone]);

  const filtered = useMemo(() => {
    if (!keyword) return moments;
    return moments.filter((moment) => String(moment?.mood || '').trim() === keyword);
  }, [moments, keyword]);

  return (
    <section className="talk-list">
      <header className="talk-hero">
        <div className="talk-hero-head">
          <div className="talk-hero-kicker-row">
            <span className="talk-hero-kicker">
              <i className="fa-solid fa-head-side-speak" aria-hidden="true" />
              <span aria-hidden="true">·</span>
              <span>TALK</span>
              <span aria-hidden="true">·</span>
              <span>滔客</span>
            </span>
            <p className="talk-hero-sub">
              共 {moments.length} 条 · {activeDays} 天有更新
            </p>
          </div>
        </div>
      </header>

      {moods.length ? (
        <nav className="talk-keyword-rail" aria-label="按关键词筛选滔客" data-talk-keyword-rail>
          <a
            className={keyword === '' ? 'talk-keyword-chip is-active' : 'talk-keyword-chip'}
            href="/moments"
            data-keyword=""
            onClick={(event) => {
              event.preventDefault();
              setKeyword('');
            }}
          >
            <span className="talk-keyword-name">全部</span>
            <b>{moments.length}</b>
          </a>
          {moods.map(([name, count]) => (
            <a
              key={name}
              className={keyword === name ? 'talk-keyword-chip is-active' : 'talk-keyword-chip'}
              href="/moments"
              data-keyword={name}
              onClick={(event) => {
                event.preventDefault();
                setKeyword(name);
              }}
            >
              <span className="talk-keyword-name">#{name}</span>
              <b>{count}</b>
            </a>
          ))}
        </nav>
      ) : null}

      <div className="talk-filter-frame" data-talk-filter-frame>
        <div className="js-list-items" aria-live="polite">
          {filtered.length === 0 ? <p className="empty">还没有滔客</p> : null}
          {filtered.map((moment: any) => (
            <TalkCard key={moment.id} moment={moment} />
          ))}
        </div>
      </div>
    </section>
  );
}
