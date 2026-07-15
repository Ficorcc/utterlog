import { createFileRoute } from '@tanstack/react-router';
import { publicAssetResponse } from '../../server/public-assets';

export const Route = createFileRoute('/static/$')({ server: { handlers: {
  GET: ({ request, params }) => publicAssetResponse(request, 'static', String(params._splat || '')),
  HEAD: ({ request, params }) => publicAssetResponse(request, 'static', String(params._splat || '')),
} } });
