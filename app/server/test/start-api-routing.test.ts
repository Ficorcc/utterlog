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
    expect(isStartNativeApiRequest(request('/api/v1/comments/42/approve', 'PATCH'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42/reply', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/pending-count', 'GET'))).toBe(true);
  });

  test('routes core authentication endpoints to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/auth/login', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/refresh', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/me', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/logout', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/login', 'GET'))).toBe(false);
  });

  test('routes profile and password management endpoints to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/profile', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/profile', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/profile/send-code', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/password', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/forgot-password', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/reset-password', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/profile', 'DELETE'))).toBe(false);
  });

  test('routes two-factor and passkey endpoints to Start', () => {
    for (const action of ['setup', 'verify', 'disable', 'validate']) {
      expect(isStartNativeApiRequest(request(`/api/v1/auth/totp/${action}`, 'POST'))).toBe(true);
    }
    for (const flow of ['register', 'login']) {
      for (const action of ['begin', 'finish']) {
        expect(isStartNativeApiRequest(request(`/api/v1/auth/passkey/${flow}/${action}`, 'POST'))).toBe(true);
      }
    }
    expect(isStartNativeApiRequest(request('/api/v1/auth/passkey/available', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/passkeys', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/passkeys/7', 'DELETE'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/totp/setup', 'GET'))).toBe(false);
  });

  test('routes visitor weather to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/visitor/weather', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/visitor/weather', 'POST'))).toBe(false);
  });

  test('routes anonymous public reads to Start while retaining authenticated admin reads', () => {
    for (const path of ['/api/v1/options', '/api/v1/categories', '/api/v1/tags', '/api/v1/posts', '/api/v1/moments', '/api/v1/links']) {
      expect(isStartNativeApiRequest(request(path, 'GET'))).toBe(true);
      expect(isStartNativeApiRequest(new Request(`https://example.test${path}`, {
        headers: { authorization: 'Bearer admin-token' },
      }))).toBe(false);
    }
    expect(isStartNativeApiRequest(request('/api/v1/comments', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/posts', 'POST'))).toBe(false);
  });

  test('routes authenticated comment list reads to Start for admin filtering', () => {
    expect(isStartNativeApiRequest(new Request('https://example.test/api/v1/comments?status=pending', {
      headers: { authorization: 'Bearer admin-token' },
    }))).toBe(true);
  });

  test('routes public detail and supplemental reads to Start', () => {
    for (const path of ['/api/v1/owner', '/api/v1/archive/stats', '/api/v1/footprints', '/api/v1/moments/recent-tags',
      '/api/v1/public/albums', '/api/v1/public/albums/summer', '/api/v1/posts/12', '/api/v1/posts/slug/hello',
      '/api/v1/posts/by-display-id/7', '/api/v1/posts/12/comments', '/api/v1/posts/12/episodes', '/api/v1/posts/12/navigation']) {
      expect(isStartNativeApiRequest(request(path, 'GET'))).toBe(true);
    }
  });

  test('routes link applications and visitor comment edits to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/links/apply', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/7/edit', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/7/edit', 'GET'))).toBe(false);
  });

  test('routes public comment creation while retaining unknown detail reads in compatibility', () => {
    expect(isStartNativeApiRequest(request('/api/v1/comments', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'GET'))).toBe(false);
  });
});
