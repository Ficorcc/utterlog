import { createFileRoute } from '@tanstack/react-router';
import { llmsFullTxtResponse } from '../../../server/src/routes/content';

export const Route = createFileRoute('/llms-full.txt')({ server: { handlers: {
  GET: () => llmsFullTxtResponse(),
} } });
