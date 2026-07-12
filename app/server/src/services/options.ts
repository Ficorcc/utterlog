import { table } from '../config';
import { exec, many, nowUnix } from '../db/helpers';
import { resolveFaviconUrl } from '../media/favicon';

const sensitiveSuffixes = ['_api_key', '_secret', '_token', '_pass', '_password', '_access_key', '_secret_key'];
const publicOptionAllowlist = new Set(['mapbox_access_token', 'footprint_mapbox_token', 'mapbox_api_url']);

export function isSensitiveOptionName(name: string) {
  const key = name.trim().toLowerCase();
  if (!key || publicOptionAllowlist.has(key)) return false;
  if (['smtp_pass', 's3_access_key', 's3_secret_key'].includes(key)) return true;
  return sensitiveSuffixes.some((suffix) => key.endsWith(suffix));
}

export async function readOptionMap(includeSensitive = false) {
  const rows = await many<{ name: string; value: string }>(`select name, value from ${table('options')} order by name asc`).catch(() => []);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (!includeSensitive && isSensitiveOptionName(row.name)) continue;
    result[row.name] = row.value;
  }
  result.site_timezone_effective = result.site_timezone || 'UTC';
  return result;
}

export async function readResolvedOptionMap(includeSensitive = false) {
  const result = await readOptionMap(includeSensitive);
  if (result.site_favicon) result.site_favicon = resolveFaviconUrl(result.site_favicon);
  return result;
}

export async function writeOptionMap(input: Record<string, unknown>) {
  const now = nowUnix();
  for (const [key, raw] of Object.entries(input)) {
    let value = typeof raw === 'string' ? raw : String(raw ?? '');
    if (key === 'site_favicon') value = resolveFaviconUrl(value) || value;
    await exec(
      `insert into ${table('options')} (name, value, created_at, updated_at)
       values ($1,$2,$3,$3)
       on conflict (name) do update set value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, now],
    );
  }
}
