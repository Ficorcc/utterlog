import { expect, test } from 'bun:test';
import { renderToString } from 'react-dom/server';
import Script from '../../blog/src/shims/script';

test('lazy scripts do not mutate the document before hydration', () => {
  expect(renderToString(<Script src="https://example.test/sdk.js" strategy="lazyOnload" />)).toBe('');
});
