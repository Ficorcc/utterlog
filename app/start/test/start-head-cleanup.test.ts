import { afterAll, expect, mock, test } from 'bun:test';
import { pathToFileURL } from 'node:url';
import { runtimePaths } from '../src/backend/paths';

let upstream: Response;
mock.module(pathToFileURL(runtimePaths.startServerEntry).href, () => ({
  default: { fetch: () => upstream },
}));
const { handleStartRequest } = await import('../src/backend/web/start');
afterAll(() => mock.restore());

test('HEAD cancels the unconsumed SSR stream and preserves headers', async () => {
  let cancelled = false;
  upstream = new Response(new ReadableStream({
    cancel() { cancelled = true; },
  }), { status: 200, headers: { etag: 'test-etag' } });
  const response = await handleStartRequest(new Request('https://ficor.net/', { method: 'HEAD' }));
  expect(cancelled).toBe(true);
  expect(response?.status).toBe(200);
  expect(response?.body).toBeNull();
  expect(response?.headers.get('etag')).toBe('test-etag');
});

test('GET still returns the complete upstream body', async () => {
  upstream = new Response('rendered page', { status: 200 });
  const response = await handleStartRequest(new Request('https://ficor.net/'));
  expect(await response?.text()).toBe('rendered page');
  expect(response?.headers.get('x-utterlog-renderer')).toBe('tanstack-start');
});

test('a cancellation failure does not change a HEAD response', async () => {
  upstream = new Response(new ReadableStream({
    cancel() { throw new Error('test cancellation failure'); },
  }), { status: 404 });
  const response = await handleStartRequest(new Request('https://ficor.net/missing', { method: 'HEAD' }));
  expect(response?.status).toBe(404);
  expect(response?.body).toBeNull();
});
