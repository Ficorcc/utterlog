import { createFileRoute } from '@tanstack/react-router';
import { robotsTxtResponse } from '../../../server/src/routes/content';

export const Route = createFileRoute('/robots.txt')({ server: { handlers: {
  GET: () => robotsTxtResponse(),
} } });
