import { describe, expect, test } from 'bun:test';
import { commentFloorPage, commentPageForId } from '../src/web/lib/comment-pages';

describe('comment floor pagination', () => {
  const roots = Array.from({ length: 7 }, (_, index) => ({
    id: index + 1,
    children: index === 0 ? [{ id: 100, is_admin: true }] : [],
  }));

  test('shows six root threads per page while keeping owner replies with their floor', () => {
    const first = commentFloorPage(roots, 1, 'oldest');
    const second = commentFloorPage(roots, 2, 'oldest');
    expect(first.floors).toHaveLength(6);
    expect(first.floors[0].comment.children).toEqual([{ id: 100, is_admin: true }]);
    expect(first.floors.map(({ floor }) => floor)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(second.floors.map(({ floor }) => floor)).toEqual([7]);
    expect(second.totalPages).toBe(2);
  });

  test('keeps floor numbers stable across newest-first pages', () => {
    expect(commentFloorPage([...roots].reverse(), 1, 'newest').floors.map(({ floor }) => floor))
      .toEqual([2, 3, 4, 5, 6, 7]);
    expect(commentFloorPage([...roots].reverse(), 2, 'newest').floors.map(({ floor }) => floor))
      .toEqual([1]);
  });

  test('starts the last full page at floor one', () => {
    const twelve = Array.from({ length: 12 }, (_, index) => ({ id: 12 - index }));
    expect(commentFloorPage(twelve, 1, 'newest').floors.map(({ floor }) => floor))
      .toEqual([7, 8, 9, 10, 11, 12]);
    expect(commentFloorPage(twelve, 2, 'newest').floors.map(({ floor }) => floor))
      .toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('opens a linked reply on the page containing its parent floor', () => {
    const withReply = roots.map((root, index) => index === 6
      ? { ...root, children: [{ id: 101, is_admin: true }] }
      : root);
    expect(commentPageForId(withReply, 101)).toBe(2);
    expect(commentPageForId(withReply, 999)).toBeNull();
  });
});
