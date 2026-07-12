import { describe, expect, test } from 'bun:test';
import { startFrontendEnabled } from '../src/web/start';

describe('TanStack Start frontend mode', () => {
  test('is always enabled after the full-stack cutover', () => {
    expect(startFrontendEnabled()).toBe(true);
  });
});
