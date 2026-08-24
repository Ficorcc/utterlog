let configuredTimeZone = '';
let effectiveTimeZone = '';

function isValidTimeZone(timeZone?: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function setAdminTimeZone(configured?: string, effective?: string) {
  configuredTimeZone = (configured || '').trim();
  effectiveTimeZone = (effective || '').trim();
}

export function adminTimeZone(): string {
  if (isValidTimeZone(configuredTimeZone)) return configuredTimeZone;
  if (isValidTimeZone(effectiveTimeZone)) return effectiveTimeZone;
  return 'Asia/Shanghai';
}

export function formatWithAdminTimeZone(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const timeZone = adminTimeZone();
  try {
    return date.toLocaleString(locale, { ...options, timeZone });
  } catch {
    return date.toLocaleString(locale, options);
  }
}

// Published timestamps are PostgreSQL "timestamp without time zone" values.
// Parse those values as site wall-clock time, not in the administrator's
// browser timezone, so every admin screen agrees with the public site.
export function adminDateFromInput(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input > 1e12 ? input : input * 1000);

  const numeric = Number(input);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return new Date(numeric > 1e12 ? numeric : numeric * 1000);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/.exec(input.trim());
  const timeZone = adminTimeZone();
  if (!match || !isValidTimeZone(timeZone)) return new Date(input);

  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part || 0));
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(guess));
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const offset = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second')) - guess;
  return new Date(guess - offset);
}

// Returns "YYYY-MM-DD" in site_timezone — replacement for the common
// `.toISOString().slice(0, 10)` pattern that silently emitted UTC.
export function adminDateYMD(date: Date): string {
  const tz = adminTimeZone();
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz,
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

// Returns "YYYY-MM-DDTHH:MM" in site_timezone — for <input type="datetime-local">
// initial values and similar "naive local datetime" use cases.
export function adminDateYMDHM(date: Date): string {
  const tz = adminTimeZone();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: tz,
    }).formatToParts(date);
    const g = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
  } catch {
    return date.toISOString().slice(0, 16);
  }
}
