import { createFileRoute } from '@tanstack/react-router';
import MomentComments from '@/pages/MomentComments';

export const Route = createFileRoute('/_authenticated/comments_/moments')({
  component: MomentComments,
});
