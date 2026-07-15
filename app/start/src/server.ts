import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import type { StartRequestContext } from './start';

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request, {
      context: { session: null, requestId: crypto.randomUUID(), clientIp: 'unknown' } satisfies StartRequestContext,
    });
  },
});
