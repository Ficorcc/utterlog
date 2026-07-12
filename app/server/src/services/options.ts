import { table } from '../config';
import { many } from '../db/helpers';

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
