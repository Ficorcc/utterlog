const DEFAULT_API_BASE = 'http://127.0.0.1:8080/api/v1';

export function apiBase() {
  return (
    process.env.UTTERLOG_START_API_URL ||
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_BASE
  ).replace(/\/+$/, '');
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Utterlog API ${path} failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function dataOf<T>(response: unknown, fallback: T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return ((response as { data?: T }).data ?? fallback);
  }
  return fallback;
}
