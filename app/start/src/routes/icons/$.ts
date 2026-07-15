import { createFileRoute } from '@tanstack/react-router';
import { publicAssetResponse } from '../../server/public-assets';

export const Route = createFileRoute('/icons/$')({ server: { handlers: {
  GET: ({ request, params }) => publicAssetResponse(request, 'icons', String(params._splat || '')),
  HEAD: ({ request, params }) => publicAssetResponse(request, 'icons', String(params._splat || '')),
} } });
