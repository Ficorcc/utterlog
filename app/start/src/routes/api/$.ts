import { createFileRoute } from '@tanstack/react-router';
import { apiFail } from '../../server/http';

const notFound = () => apiFail(404, 'NOT_FOUND', 'api route not found');

export const Route = createFileRoute('/api/$')({ server: { handlers: {
  GET: notFound,
  POST: notFound,
  PUT: notFound,
  PATCH: notFound,
  DELETE: notFound,
  OPTIONS: notFound,
  HEAD: notFound,
} } });
