import { createFileRoute } from '@tanstack/react-router';
import { join } from 'node:path';
import { config } from '../../../../server/src/config';

export const Route = createFileRoute('/admin/$')({
  server: { handlers: { GET: async () => {
    const file = Bun.file(join(config.adminDistDir, 'index.html'));
    if (!(await file.exists())) return new Response('Admin build not found', { status: 503 });
    return new Response(file, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache, no-store, must-revalidate',
        'x-utterlog-renderer': 'tanstack-start-admin',
        pragma: 'no-cache',
        expires: '0',
      },
    });
  } } },
});
