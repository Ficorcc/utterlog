import { createFileRoute } from '@tanstack/react-router';
import { llmsTxtResponse } from '../../../server/src/routes/content';

export const Route = createFileRoute('/llms.txt')({ server: { handlers: {
  GET: () => llmsTxtResponse(),
} } });
