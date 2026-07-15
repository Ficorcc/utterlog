import { createFileRoute } from '@tanstack/react-router';
import { publicAssetResponse } from '../../server/public-assets';

export const Route = createFileRoute('/emoji/$')({ server: { handlers: {
  GET: ({ request, params }) => publicAssetResponse(request, 'emoji', String(params._splat || '')),
  HEAD: ({ request, params }) => publicAssetResponse(request, 'emoji', String(params._splat || '')),
} } });
