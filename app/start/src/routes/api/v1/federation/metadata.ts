import { createFileRoute } from '@tanstack/react-router';
import { siteMetadata } from '../../../../../../server/src/routes/compat';
import { apiOk } from '../../../../server/http';

export const Route = createFileRoute('/api/v1/federation/metadata')({ server: { handlers: {
  GET: async () => apiOk(await siteMetadata()),
} } });
