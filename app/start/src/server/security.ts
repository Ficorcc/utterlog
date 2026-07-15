import { table } from '../../../server/src/config';
import { exec, nowUnix, one } from '../../../server/src/db/helpers';
import { optionValue } from '../../../server/src/db/options';
import { lookupGeoIp, normalizeGeoProvider } from '../../../server/src/geoip';
import type { AuthSession } from '../../../server/src/auth/session';

type Bucket = { count: number; resetAt: number };
type SecuritySettings = {
  ccEnabled: boolean;
  ccLimit5s: number;
  ccLimit60s: number;
  geoEnabled: boolean;
  geoMode: 'whitelist' | 'blacklist';
  geoCountries: string[];
  geoProvider: string;
  apiRateLimit: number;
};

const buckets = new Map<string, Bucket>();
const ccBuckets5s = new Map<string, Bucket>();
const ccBuckets60s = new Map<string, Bucket>();
let settingsCache: { value: SecuritySettings; expiresAt: number } | null = null;

function boolValue(value: unknown) {
  return value === true || value === 'true' || value === '1';
}

async function settings() {
  const now = Date.now();
  if (settingsCache && settingsCache.expiresAt > now) return settingsCache.value;
  const rawMode = String(await optionValue('geo_mode', 'whitelist')).toLowerCase();
  const value: SecuritySettings = {
    ccEnabled: boolValue(await optionValue('cc_enabled', 'false')),
    ccLimit5s: Math.max(1, Number(await optionValue('cc_limit_5s', '30')) || 30),
    ccLimit60s: Math.max(1, Number(await optionValue('cc_limit_60s', '120')) || 120),
    geoEnabled: boolValue(await optionValue('geo_enabled', 'false')),
    geoMode: rawMode === 'blacklist' ? 'blacklist' : 'whitelist',
    geoCountries: String(await optionValue('geo_countries', 'CN,HK,TW,MO')).split(',').map((v) => v.trim().toUpperCase()).filter(Boolean),
    geoProvider: normalizeGeoProvider(await optionValue('ip_geo_provider', 'ipx')),
    apiRateLimit: Math.max(1, Number(await optionValue('rate_limit', '300')) || 300),
  };
  settingsCache = { value, expiresAt: now + 5000 };
  return value;
}

function bump(map: Map<string, Bucket>, key: string, windowMs: number) {
  const now = Date.now();
  const current = map.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    map.set(key, next);
    return next;
  }
  current.count += 1;
  return current;
}

async function banned(ip: string) {
  if (!ip || ip === 'unknown') return false;
  const row = await one<{ count: string }>(
    `select count(*)::text as count from ${table('ip_bans')} where ip = $1 and (expires_at = 0 or expires_at > $2)`,
    [ip, nowUnix()],
  ).catch(() => null);
  return Number(row?.count || 0) > 0;
}

async function logEvent(ip: string, eventType: string, detail: string) {
  await exec(
    `insert into ${table('security_events')} (ip, event_type, detail, score_delta, created_at) values ($1, $2, $3, 0, $4)`,
    [ip, eventType, detail, nowUnix()],
  ).catch(() => {});
}

function fail(status: number, code: string, message: string, retryAfter?: number) {
  const response = Response.json({ success: false, error: { code, message } }, { status });
  if (retryAfter) response.headers.set('retry-after', String(retryAfter));
  return response;
}

function publicRead(path: string, method: string) {
  if (method !== 'GET') return false;
  return /^\/api\/v1\/(options|posts|categories|tags|archive\/stats|owner|online|menus)(\/|$)/.test(path)
    || /^\/api\/v1\/posts\/(slug\/[^/]+|\d+|by-display-id\/\d+)$/.test(path);
}

function limitFor(path: string, configured: number) {
  if (path.includes('/auth/login')) return 10;
  if (path.includes('/auth/forgot-password') || path.includes('/auth/reset-password')) return 5;
  if (path.includes('/location/reverse')) return 30;
  if (path.includes('/comments')) return 30;
  if (path.includes('/ai/reader-chat')) return 20;
  if (path.includes('/sync/')) return 240;
  if (path.startsWith('/api/v1/admin/')) return 600;
  return configured;
}

export async function checkStartSecurity(request: Request, ip: string, session: AuthSession | null) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/')) return null;
  if (path.startsWith('/api/v1/install') || path.startsWith('/api/v1/setup')) return null;

  const admin = path.startsWith('/api/v1/admin/') || path.startsWith('/api/v1/security') || path.startsWith('/api/v1/sync/');
  if (!admin && await banned(ip)) {
    await logEvent(ip, 'ip_banned', path);
    return fail(403, 'IP_BANNED', '当前 IP 已被封禁');
  }

  if (session) return null;
  const configured = await settings().catch(() => null);
  if (!configured) return null;

  if (!admin && configured.geoEnabled) {
    const country = String(request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || '').trim().toUpperCase();
    if (country && country !== 'XX') {
      const matched = configured.geoCountries.includes(country);
      if (configured.geoMode === 'whitelist' ? !matched : matched) {
        await logEvent(ip, 'geoip_block', `country:${country}`);
        return fail(403, 'GEO_BLOCKED', '当前地区暂不可访问');
      }
    } else if (configured.geoEnabled && ip !== 'unknown') {
      const geo = await lookupGeoIp(ip, configured.geoProvider, 1500).catch(() => null);
      const matched = Boolean(geo?.country_code && configured.geoCountries.includes(geo.country_code.toUpperCase()));
      if (geo?.country_code && (configured.geoMode === 'whitelist' ? !matched : matched)) {
        await logEvent(ip, 'geoip_block', `country:${geo.country_code}`);
        return fail(403, 'GEO_BLOCKED', '当前地区暂不可访问');
      }
    }
  }

  if (!admin && configured.ccEnabled) {
    const short = bump(ccBuckets5s, ip, 5000);
    const minute = bump(ccBuckets60s, ip, 60_000);
    if (short.count > configured.ccLimit5s || minute.count > configured.ccLimit60s) {
      await logEvent(ip, 'cc_block', `5s:${short.count}/60s:${minute.count}`);
      return fail(429, 'CC_BLOCKED', '请求过于频繁，请稍后再试', 5);
    }
  }

  if (publicRead(path, request.method.toUpperCase())) return null;
  const max = limitFor(path, configured.apiRateLimit);
  const bucket = bump(buckets, `${path}:${ip}`, 60_000);
  if (bucket.count > max) {
    return fail(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试', Math.ceil((bucket.resetAt - Date.now()) / 1000));
  }
  return null;
}
