import { createFileRoute } from '@tanstack/react-router';
import { CredentialTestError, testCredential } from '@backend/services/credential-test';
import { apiFail, apiOk, withAdmin } from '../../../../server/http';

/** 后台「第三方服务」里各个 Token / API Key 旁边那个测试按钮。仅管理员可用。 */
export const Route = createFileRoute('/api/v1/options/test-credential')({
  server: {
    handlers: {
      POST: ({ request }) => withAdmin(request, async () => {
        try {
          return apiOk(await testCredential(await request.json().catch(() => ({}))));
        } catch (error) {
          if (error instanceof CredentialTestError) return apiFail(error.status, error.code, error.message);
          throw error;
        }
      }),
    },
  },
});
