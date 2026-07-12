import { describe, expect, test } from 'bun:test';
import { asContentResource, ContentRecordError, deleteContentRecord, updateContentRecord } from '../src/services/content-records';

describe('content record validation', () => {
  test('rejects unknown resources and invalid ids before database access', async () => {
    expect(() => asContentResource('posts')).toThrow(ContentRecordError);
    await expect(updateContentRecord('books', 0, {})).rejects.toBeInstanceOf(ContentRecordError);
    await expect(deleteContentRecord('movies', -1)).rejects.toBeInstanceOf(ContentRecordError);
  });
});
