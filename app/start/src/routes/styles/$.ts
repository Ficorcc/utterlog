import { createFileRoute } from '@tanstack/react-router';
import { publicAssetResponse } from '../../server/public-assets';

export const Route = createFileRoute('/styles/$')({ server: { handlers: {
  GET: ({ request, params }) => publicAssetResponse(request, 'styles', String(params._splat || '')),
  HEAD: ({ request, params }) => publicAssetResponse(request, 'styles', String(params._splat || '')),
} } });
