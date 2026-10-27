import { describe, expect, test } from 'bun:test';
import { commentFloorPage, commentPageForId } from '../src/web/lib/comment-pages';

describe('comment floor pagination', () => {
  const roots = Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    children: index === 0 ? [{ id: 100, is_admin: true }] : [],
  }));

  test('shows ten root threads per page while keeping owner replies with their floor', () => {
    const first = commentFloorPage(roots, 1, 'oldest');
    const second = commentFloorPage(roots, 2, 'oldest');
    expect(first.floors).toHaveLength(10);
    expect(first.floors[0].comment.children).toEqual([{ id: 100, is_admin: true }]);
    expect(first.floors.map(({ floor }) => floor)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(second.floors.map(({ floor }) => floor)).toEqual([11]);
    expect(second.totalPages).toBe(2);
  });

  test('puts the remainder on page one and fills the final page in descending order', () => {
    expect(commentFloorPage([...roots].reverse(), 1, 'newest').floors.map(({ floor }) => floor))
      .toEqual([11]);
    expect(commentFloorPage([...roots].reverse(), 2, 'newest').floors.map(({ floor }) => floor))
      .toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  test('keeps complete ten-floor pages when the count divides evenly', () => {
    const twenty = Array.from({ length: 20 }, (_, index) => ({ id: 20 - index }));
    expect(commentFloorPage(twenty, 1, 'newest').floors.map(({ floor }) => floor))
      .toEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11]);
    expect(commentFloorPage(twenty, 2, 'newest').floors.map(({ floor }) => floor))
      .toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  test('keeps the final page full when the first page has one floor', () => {
    const twentyOne = Array.from({ length: 21 }, (_, index) => ({ id: 21 - index }));
    expect(commentFloorPage(twentyOne, 1, 'newest').floors.map(({ floor }) => floor)).toEqual([21]);
    expect(commentFloorPage(twentyOne, 3, 'newest').floors.map(({ floor }) => floor))
      .toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  test('opens a linked reply on the page containing its parent floor', () => {
    const withReply = roots.map((root, index) => index === 10
      ? { ...root, children: [{ id: 101, is_admin: true }] }
      : root);
    expect(commentPageForId(withReply, 101, 'oldest')).toBe(2);
    expect(commentPageForId(withReply, 999, 'oldest')).toBeNull();
    const newest = [...withReply].reverse();
    expect(commentPageForId(newest, 101, 'newest')).toBe(1);
    expect(commentPageForId(newest, 100, 'newest')).toBe(2);
  });
});
