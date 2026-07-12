import { afterEach, describe, expect, test } from 'bun:test';
import { startFrontendEnabled } from '../src/web/start';

const originalFrontend = process.env.UTTERLOG_FRONTEND;
const originalRenderer = process.env.WEB_RENDERER;

afterEach(() => {
  if (originalFrontend === undefined) delete process.env.UTTERLOG_FRONTEND;
  else process.env.UTTERLOG_FRONTEND = originalFrontend;
  if (originalRenderer === undefined) delete process.env.WEB_RENDERER;
  else process.env.WEB_RENDERER = originalRenderer;
});

describe('TanStack Start frontend mode', () => {
  test('recognizes explicit Start selectors', () => {
    process.env.UTTERLOG_FRONTEND = 'start';
    expect(startFrontendEnabled()).toBe(true);
    process.env.UTTERLOG_FRONTEND = 'tanstack-start';
    expect(startFrontendEnabled()).toBe(true);
  });

  test('keeps the legacy renderer as the default', () => {
    delete process.env.UTTERLOG_FRONTEND;
    process.env.WEB_RENDERER = 'bun';
    expect(startFrontendEnabled()).toBe(false);
  });
});
