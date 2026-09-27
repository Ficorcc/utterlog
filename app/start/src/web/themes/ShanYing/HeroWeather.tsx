'use client';

import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useThemeContext } from '@/lib/theme-context';

type Weather = { city?: string; temperature?: number | null; weather_code?: number | null; is_day?: boolean; fallback?: boolean; stale?: boolean };

function condition(code: number, day: boolean) {
  if (code === 0) return { label: day ? '晴' : '晴夜', kind: day ? 'sun' : 'moon' };
  if (code === 1 || code === 2) return { label: '少云', kind: day ? 'cloud-sun' : 'cloud-moon' };
  if (code === 3) return { label: '多云', kind: 'cloud' };
  if (code === 45 || code === 48) return { label: '雾', kind: 'fog' };
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return { label: '雨', kind: 'rain' };
  if ([71,73,75,77,85,86].includes(code)) return { label: '雪', kind: 'snow' };
  if ([95,96,99].includes(code)) return { label: '雷雨', kind: 'storm' };
  return { label: '天气信息暂不可用', kind: 'unknown' };
}

export default function HeroWeather() {
  const { visitorWeather, timeZone } = useThemeContext();
  const [now, setNow] = useState<Date | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const detailsId = useId();
  const open = hovered || focused || pinned;
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const zone = timeZone || 'Asia/Shanghai';
  const date = now ? new Intl.DateTimeFormat('zh-CN', { timeZone: zone, dateStyle: 'long' }).format(now) : '';
  const weekday = now ? new Intl.DateTimeFormat('zh-CN', { timeZone: zone, weekday: 'long' }).format(now) : '';
  let lunar = '';
  if (now) {
    const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { timeZone: zone, month: 'long', day: 'numeric' }).formatToParts(now);
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = Number(parts.find(p => p.type === 'day')?.value);
    const digits = ['一','二','三','四','五','六','七','八','九','十'];
    const dayName = day <= 10 ? `初${digits[day - 1]}` : day < 20 ? `十${digits[day - 11]}` : day === 20 ? '二十' : day < 30 ? `廿${digits[day - 21]}` : '三十';
    lunar = `${month}${dayName}`;
  }
  const { data, isPending, isError } = useQuery<Weather>({
    queryKey: ['shanying-hero-weather'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/v1/visitor/weather', { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Weather unavailable');
      const payload = await response.json();
      return payload.data || {};
    },
    initialData: visitorWeather && !visitorWeather.fallback && !visitorWeather.stale ? visitorWeather : undefined,
    staleTime: 60_000,
    refetchInterval: 600_000,
    retry: 1,
  });
  const valid = data && !data.fallback && typeof data.weather_code === 'number';
  const meta = valid ? condition(data.weather_code!, data.is_day !== false) : { label: isPending ? '天气加载中' : '天气暂不可用', kind: 'unknown' };
  const label = valid ? [data.city, meta.label, typeof data.temperature === 'number' ? `${Math.round(data.temperature)}°C` : '', data.stale || isError ? '缓存天气' : ''].filter(Boolean).join(' · ') : meta.label;
  const kind = meta.kind;
  const cloud = ['cloud','cloud-sun','cloud-moon','rain','snow','storm'].includes(kind);

  return (
    <div className="sy-hero-weather" data-weather={kind} data-open={open ? 'true' : 'false'}
      onPointerEnter={e => { if (e.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onKeyDown={e => { if (e.key === 'Escape') { setPinned(false); setFocused(false); setHovered(false); } }}>
      <div className="sy-hero-weather-details" id={detailsId} role="tooltip" aria-hidden={!open}>
        <span>{date}{lunar ? `  农历${lunar}` : ''}{weekday ? ` · ${weekday}` : ''}</span>
        <span>{label}</span>
      </div>
      <button type="button" className="sy-hero-weather-trigger" aria-label={`查看天气：${label}`} aria-expanded={open} aria-describedby={open ? detailsId : undefined}
        onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setFocused(true); }}
        onBlur={() => { setFocused(false); setPinned(false); }}
        onClick={() => setPinned(value => !value)}>
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {kind === 'moon' && <path d="M24.9 21.2A12 12 0 0 1 11 5.1 12.1 12.1 0 1 0 24.9 21.2Z" />}
        {kind === 'sun' && <><circle cx="16" cy="16" r="6" /><path d="M16 2v3m0 22v3M2 16h3m22 0h3M6.1 6.1l2.1 2.1m15.6 15.6 2.1 2.1M6.1 25.9l2.1-2.1M23.8 8.2l2.1-2.1" /></>}
        {kind === 'cloud-sun' && <><path d="M8 15a6 6 0 1 1 11-4M12 2v2M3 11h2m.5-6.5L7 6m12 0 1.5-1.5" /></>}
        {kind === 'cloud-moon' && <path d="M17 11A7 7 0 0 1 10 3a8 8 0 0 0-4 13" />}
        {cloud && <path d="M8 23a5 5 0 0 1-1-9.9A7 7 0 0 1 20.5 12 5.5 5.5 0 1 1 24 23H8Z" />}
        {kind === 'rain' && <path d="m10 26-1 3m8-3-1 3m8-3-1 3" />}
        {kind === 'snow' && <path d="M10 26v4m-2-2h4m9-2v4m-2-2h4" />}
        {kind === 'storm' && <path d="m17 21-4 6h5l-3 4" />}
        {kind === 'fog' && <path d="M5 9h22M2 15h23M7 21h23M4 27h20" />}
        {kind === 'unknown' && <><circle cx="16" cy="16" r="11" /><path d="M13 12a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 5h.01" /></>}
      </svg>
      </button>
    </div>
  );
}
