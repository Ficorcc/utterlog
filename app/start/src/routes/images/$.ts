import { createFileRoute } from '@tanstack/react-router';
import { publicAssetResponse } from '../../server/public-assets';

export const Route = createFileRoute('/images/$')({ server: { handlers: {
  GET: ({ request, params }) => publicAssetResponse(request, 'images', String(params._splat || '')),
  HEAD: ({ request, params }) => publicAssetResponse(request, 'images', String(params._splat || '')),
} } });
