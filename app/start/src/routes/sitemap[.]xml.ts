import { createFileRoute } from '@tanstack/react-router';
import { sitemapXmlResponse } from '../../../server/src/routes/content';

export const Route = createFileRoute('/sitemap.xml')({ server: { handlers: {
  GET: () => sitemapXmlResponse(),
} } });
