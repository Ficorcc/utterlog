import { createFileRoute } from '@tanstack/react-router';
import { apiOk } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/i18n/current')({ server: { handlers: {
  GET: async () => apiOk({ locale: 'zh-CN' }),
} } });
