'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconSkipNext, IconSkipPrev } from './Icons';

/**
 * 心情卡里的迷你音乐播放器。
 *
 * 结构对齐原站 notice.php 的心情卡（.mood-song 条）：圆形封面 + 「歌名 - 歌手」
 * + 上一首 / 下一首 / 播放。播放列表来自站内音乐库（已发布歌曲），
 * 站长也可以用站点选项 robes_mood_song 指定「此刻在听」的歌单。
 */
export interface MoodSong {
  id?: number | string;
  title: string;
  artist: string;
  cover: string;
  url: string;
}

interface MoodPlayerProps {
  songs: MoodSong[];
}

export default function MoodPlayer({ songs }: MoodPlayerProps) {
  const list = songs || [];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const songsRef = useRef<MoodSong[]>(list);
  const indexRef = useRef(0);
  const playAtRef = useRef<(i: number) => void>(() => {});
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  songsRef.current = list;

  const current = list[index] || list[0] || null;

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'none';
      audio.addEventListener('ended', () => {
        // 播完自动下一首，最后一首回到第一首。
        playAtRef.current(indexRef.current + 1);
      });
      audio.addEventListener('play', () => setPlaying(true));
      audio.addEventListener('pause', () => setPlaying(false));
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  /** 跳到第 i 首并开始播放（越界自动回绕）。 */
  const playAt = useCallback(
    (i: number) => {
      const pool = songsRef.current;
      if (!pool.length) return;
      const next = ((i % pool.length) + pool.length) % pool.length;
      const song = pool[next];
      if (!song?.url) return;
      const audio = ensureAudio();
      indexRef.current = next;
      setIndex(next);
      if (audio.getAttribute('src') !== song.url) {
        audio.setAttribute('src', song.url);
        audio.load();
      }
      void audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    },
    [ensureAudio],
  );

  playAtRef.current = playAt;

  const toggle = useCallback(() => {
    if (!current?.url) return;
    const audio = ensureAudio();
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (audio.getAttribute('src') !== current.url) {
      audio.setAttribute('src', current.url);
      audio.load();
    }
    void audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, [current, ensureAudio]);

  // 歌单换了就回到第一首（并停掉正在播的旧歌）。
  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
    }
    setPlaying(false);
  }, [list]);

  // 面板关闭时组件卸载，把音频停掉，避免后台继续放。
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
    };
  }, []);

  if (!current) return null;

  return (
    <div className="mood-song" role="group" aria-label="音乐播放器">
      <span className="mood-song-cover">
        {current.cover ? (
          <img src={current.cover} alt="" loading="lazy" />
        ) : (
          <span className="mood-song-cover-text">{String(current.title || '♪').slice(0, 1)}</span>
        )}
      </span>
      <span className="mood-song-meta">
        <span className="mood-song-name">{current.title}</span>
        <span className="mood-song-artist">{current.artist}</span>
      </span>
      <span className="mood-song-ctrl">
        <button
          type="button"
          className="mood-song-skip"
          onClick={() => playAt(indexRef.current - 1)}
          title="上一首"
          aria-label="上一首"
        >
          <IconSkipPrev size={13} />
        </button>
        <button
          type="button"
          className="mood-song-skip"
          onClick={() => playAt(indexRef.current + 1)}
          title="下一首"
          aria-label="下一首"
        >
          <IconSkipNext size={13} />
        </button>
        <button
          type="button"
          className={playing ? 'mood-song-play is-playing' : 'mood-song-play'}
          onClick={toggle}
          aria-label={playing ? '暂停' : '播放'}
          title={playing ? '暂停' : '播放'}
        >
          <span className="mood-play-glyph" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
