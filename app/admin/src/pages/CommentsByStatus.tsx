import { useParams } from '@/lib/router';
import CommentsPage from './Comments';

// /admin/comments/:status → status="pending" | "spam" | "trash" | "mine"
export default function CommentsByStatus() {
  const { status } = useParams<{ status: string }>();
  return <CommentsPage initialStatus={status} />;
}
