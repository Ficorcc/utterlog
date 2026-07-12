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

  test('keeps public creation, replies, and reads on the compatibility API', () => {
    expect(isStartNativeApiRequest(request('/api/v1/comments', 'POST'))).toBe(false);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42/reply', 'POST'))).toBe(false);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'GET'))).toBe(false);
  });
});
