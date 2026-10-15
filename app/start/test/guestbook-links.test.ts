import { expect, test } from 'bun:test';
import { commentPagePath } from '../src/backend/services/guestbook';

test('guestbook comment notifications return to the guestbook while post links stay unchanged', () => {
  expect(commentPagePath({ type: 'guestbook', slug: 'utterlog-system-guestbook-thread' }, 42, 17))
    .toBe('/guestbook#comment-17');
  expect(commentPagePath({ type: 'post', slug: 'hello' }, 3, 18))
    .toBe('/posts/hello#comment-18');
});
