import { describe, expect, test } from 'bun:test';
import { isStartNativeApiRequest } from '../src/web/start';

function request(path: string, method: string) {
  return new Request(`https://example.test${path}`, { method });
}

describe('TanStack Start native API routing', () => {
  test('routes migrated comment mutations to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/comments/batch', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'PATCH'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'DELETE'))).toBe(true);
  });

  test('keeps public creation, replies, and reads on the compatibility API', () => {
    expect(isStartNativeApiRequest(request('/api/v1/comments', 'POST'))).toBe(false);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42/reply', 'POST'))).toBe(false);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'GET'))).toBe(false);
  });
});
