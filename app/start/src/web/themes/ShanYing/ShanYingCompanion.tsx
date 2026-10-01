'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThemeContext } from '@/lib/theme-context';

type Song = {
  id: number | string;
  title: string;
  artist: string;
  cover: string;
  url: string;
};

const boolOption = (value: string | undefined, fallback = true) =>
  value == null || value === '' ? fallback : value !== 'false';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
};

const normalizeSongs = (rows: any[]): Song[] => rows
  .filter((row) => row?.play_url || row?.platform_id || row?.id)
  .map((row) => {
    const platform = row.platform || 'netease';
    const platformId = row.platform_id || String(row.id);
    return {
      id: row.id ?? platformId,
      title: row.title || '未命名歌曲',
      artist: row.artist || '未知歌手',
      cover: row.cover_url || `/api/v1/music/proxy/${encodeURIComponent(platform)}/songs/${encodeURIComponent(platformId)}/cover`,
      url: row.play_url || `/api/v1/music/proxy/${encodeURIComponent(platform)}/songs/${encodeURIComponent(platformId)}/stream`,
    };
  });

function Bird({ name, onWave }: { name: string; onWave: () => void }) {
  return (
    <button className="sy-companion-bird" type="button" title={`${name}：拖动我，或点我打招呼`} aria-label={`${name}，可拖动的小鸟`} onClick={onWave}>
      <svg className="sy-companion-bird-art" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <ellipse cx="60" cy="107" rx="29" ry="4" fill="#172e3818" />
        <g className="sy-pet-body" fill="#b4d4c7" stroke="#344b51" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <g className="sy-pet-tail"><path d="m38 80-18-7 11 21 16-6" fill="#759f9c" /></g>
          <g><path d="M41 95v12m-4 0h8M57 95v12m-4 0h8" /></g>
          <g className="sy-pet-torso"><path d="M30 70c-2-24 9-39 31-39 23 0 36 12 32 34-3 23-15 36-37 34-17-1-24-12-26-29Z" /><ellipse cx="62" cy="78" rx="20" ry="18" fill="#f4f0d9" stroke="none" /></g>
          <g className="sy-pet-wing-right"><path d="M85 63q20 12 11 23-14-4-18-17" fill="#83aaa3" /></g>
          <g className="sy-pet-head"><path d="M32 59c-2-19 9-33 29-33 21 0 35 13 32 33-15 12-42 10-61 0Z" /><path d="M54 28c-4-9 2-14 8-8 5-6 10-1 8 7" /><path d="m90 51 15 7-16 7" fill="#edba75" /><ellipse className="sy-pet-eye" cx="75" cy="49" rx="3" ry="4" fill="#344b51" stroke="none" /><circle cx="80" cy="59" r="5" fill="#e9ada0" stroke="none" /></g>
          <g className="sy-pet-wing-left"><path d="M38 58c-7 1-9 19 2 22 8 3 16-4 19-15-8 3-15 0-21-7Z" fill="#83aaa3" /></g>
        </g>
      </svg>
    </button>
  );
}

export default function ShanYingCompanion() {
  const { options } = useThemeContext();
  const musicEnabled = boolOption(options.shanying_music_enabled);
  const petEnabled = boolOption(options.shanying_pet_enabled);
  const petMobile = boolOption(options.shanying_pet_mobile);
  const petName = options.shanying_pet_name?.trim() || '啾啾';
  const playlistId = options.shanying_music_playlist_id?.trim() || 'auto';
  const side = options.shanying_companion_side === 'right' ? 'right' : 'left';
  const audioRef = useRef<HTMLAudioElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(musicEnabled);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.65);
  const [bubble, setBubble] = useState('');
  const [freePosition, setFreePosition] = useState<{ left: number; top: number } | null>(null);
  const song = songs[index];

  useEffect(() => {
    if (!musicEnabled) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let rows: any[] = [];
        if (playlistId !== 'auto') {
          const payload = await fetch(`/api/v1/playlists/${encodeURIComponent(playlistId)}`).then((response) => response.ok ? response.json() : null);
          rows = payload?.data?.songs || payload?.songs || [];
        } else {
          const listsPayload = await fetch('/api/v1/playlists?per_page=100').then((response) => response.ok ? response.json() : null);
          const lists = listsPayload?.data || [];
          const selected = lists.find((item: any) => item.is_default) || lists[0];
          if (selected?.id) {
            const payload = await fetch(`/api/v1/playlists/${selected.id}`).then((response) => response.ok ? response.json() : null);
            rows = payload?.data?.songs || payload?.songs || [];
          }
        }
        if (!rows.length) {
          const payload = await fetch('/api/v1/music?per_page=500').then((response) => response.ok ? response.json() : null);
          rows = payload?.data || [];
        }
        if (!cancelled) setSongs(normalizeSongs(rows));
      } catch {
        if (!cancelled) setSongs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [musicEnabled, playlistId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('shanying-companion-position');
      if (saved) setFreePosition(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    audio.load();
    setTime(0);
    if (playing) audio.play().catch(() => setPlaying(false));
  }, [index, song?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, song]);

  const selectSong = (next: number, autoPlay = true) => {
    if (!songs.length) return;
    setIndex((next + songs.length) % songs.length);
    if (autoPlay) setPlaying(true);
  };

  const greet = useCallback(() => {
    const phrases = ['今天也一起听点音乐吧。', '啾！很高兴见到你。', '拖动我，可以换个停靠位置。'];
    setBubble(phrases[Math.floor(Math.random() * phrases.length)]);
    window.setTimeout(() => setBubble(''), 2600);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!petEnabled || (event.target as HTMLElement).closest('.sy-companion-panel')) return;
    const bird = (event.target as HTMLElement).closest('.sy-companion-bird');
    if (!bird || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    dragRef.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (!drag.moved) return;
    const width = rootRef.current?.offsetWidth || 210;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, drag.left + dx));
    const top = Math.max(8, Math.min(window.innerHeight - 74, drag.top + dy));
    setFreePosition({ left, top });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag?.moved) {
      const width = rootRef.current?.offsetWidth || 210;
      const position = {
        left: Math.max(8, Math.min(window.innerWidth - width - 8, drag.left + event.clientX - drag.x)),
        top: Math.max(8, Math.min(window.innerHeight - 74, drag.top + event.clientY - drag.y)),
      };
      setFreePosition(position);
      try { localStorage.setItem('shanying-companion-position', JSON.stringify(position)); } catch {}
    }
  };

  const positionStyle = useMemo(() => freePosition ? { left: freePosition.left, top: freePosition.top, right: 'auto', bottom: 'auto' } : undefined, [freePosition]);
  if (!musicEnabled && !petEnabled) return null;

  return (
    <div
      ref={rootRef}
      className={`sy-companion sy-companion--${side}${freePosition ? ' is-free' : ''}${!petMobile ? ' sy-companion--hide-mobile' : ''}`}
      style={positionStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {petEnabled && <Bird name={petName} onWave={greet} />}
      {bubble && <span className="sy-companion-bubble" role="status">{bubble}</span>}
      {musicEnabled && (
        <>
          <audio
            ref={audioRef}
            src={song?.url}
            preload="metadata"
            onTimeUpdate={() => setTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => selectSong(index + 1)}
          />
          <div className="sy-companion-mini">
            <button className="sy-companion-note" type="button" onClick={() => song ? setPlaying(!playing) : setExpanded(true)} aria-label={playing ? '暂停音乐' : '播放音乐'}>
              <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-music'}`} aria-hidden="true" />
            </button>
            <button className="sy-companion-copy" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
              <strong>{song ? song.title : (loading ? '正在准备音乐…' : '给此刻一点音乐')}</strong>
              {song && <span>{song.artist}</span>}
            </button>
            <button className="sy-companion-toggle" type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? '收起播放器' : '展开播放器'}>
              <i className={`fa-solid fa-chevron-${expanded ? 'down' : 'up'}`} aria-hidden="true" />
            </button>
            <span className="sy-companion-progress"><i style={{ width: `${duration > 0 ? time / duration * 100 : 0}%` }} /></span>
          </div>
          {expanded && (
            <section className="sy-companion-panel" aria-label="音乐播放器">
              <header>
                <div><small>此刻正在听</small><strong>{song?.title || '暂无可播放歌曲'}</strong><span>{song?.artist || '请先在后台添加歌曲'}</span></div>
                <button type="button" onClick={() => setExpanded(false)} aria-label="关闭"><i className="fa-solid fa-xmark" /></button>
              </header>
              {song && (
                <>
                  <div className="sy-companion-seek">
                    <input type="range" min="0" max="1000" value={duration > 0 ? Math.round(time / duration * 1000) : 0} onChange={(event) => { if (audioRef.current && duration) audioRef.current.currentTime = Number(event.target.value) / 1000 * duration; }} aria-label="播放进度" />
                    <div><time>{formatTime(time)}</time><time>{formatTime(duration)}</time></div>
                  </div>
                  <div className="sy-companion-controls">
                    <button type="button" onClick={() => selectSong(index - 1)} aria-label="上一首"><i className="fa-solid fa-backward-step" /></button>
                    <button className="is-primary" type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? '暂停' : '播放'}><i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} /></button>
                    <button type="button" onClick={() => selectSong(index + 1)} aria-label="下一首"><i className="fa-solid fa-forward-step" /></button>
                    <label><i className="fa-solid fa-volume-low" /><input type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(event) => setVolume(Number(event.target.value) / 100)} aria-label="音量" /></label>
                  </div>
                </>
              )}
              <ol className="sy-companion-playlist">
                {songs.map((item, itemIndex) => <li key={item.id}><button className={itemIndex === index ? 'is-current' : ''} type="button" onClick={() => selectSong(itemIndex)}><span>{String(itemIndex + 1).padStart(2, '0')}</span><strong>{item.title}</strong><small>{item.artist}</small></button></li>)}
              </ol>
              {!songs.length && <a className="sy-companion-empty" href="/music">前往音乐管理页面</a>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
