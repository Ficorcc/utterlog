import { createFileRoute } from '@tanstack/react-router';
import { authenticateRequest } from '../../../../../server/src/auth/session';
import { codingPayload } from '../../../../../server/src/routes/coding';
import { apiOk } from '../../../server/http';

export const Route = createFileRoute('/api/v1/coding')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const query = new URL(request.url).searchParams;
        const session = await authenticateRequest(request).catch(() => null);
        const includeRepos = query.get('include_repos') === 'true' && Boolean(session);
        return apiOk(await codingPayload(includeRepos));
      },
    },
  },
});
