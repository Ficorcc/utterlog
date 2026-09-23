import { expect, test } from 'bun:test';

test('article themes no longer mount reader chat or reopen controls', async () => {
  const files = new Bun.Glob('app/start/src/web/themes/**/*.tsx');
  for await (const path of files.scan('.')) {
    const source = await Bun.file(path).text();
    expect(source).not.toContain('AIReaderChat');
    expect(source).not.toContain('useReaderChatStore');
  }
});

test('reader API and admin toggle are removed without removing comments', async () => {
  const route = await Bun.file('app/start/src/routes/api/v1/ai/$action.ts').text();
  expect(route).not.toContain('reader-chat');
  const settings = await Bun.file('app/admin/src/pages/AiSettings.tsx').text();
  expect(settings).not.toContain('ai_reader_chat_enabled');
  const article = await Bun.file('app/start/src/web/themes/Utterlog/PostPage.tsx').text();
  expect(article).toContain('<CommentList postId={post.id} />');
});
