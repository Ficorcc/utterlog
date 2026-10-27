import api from './api';

export const COMMENT_FLOORS_PER_PAGE = 6;
const COMMENT_FETCH_BATCH = 500;

// The API paginates individual comments. Gather its batches before paginating
// top-level threads, so replies never split from their parent or use a floor.
export async function loadApprovedComments<T>(postId: number, order: 'asc' | 'desc'): Promise<T[]> {
  const comments: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result: any = await api.get('/comments', { params: {
      post_id: postId,
      status: 'approved',
      per_page: COMMENT_FETCH_BATCH,
      order,
      page,
    } });
    const batch = result.data || result.comments || [];
    if (!Array.isArray(batch)) throw new Error('Invalid comments response');
    comments.push(...batch);
    totalPages = Math.max(1, Number(result.meta?.total_pages || result.pagination?.total_pages || 1));
    page++;
  } while (page <= totalPages);
  return comments;
}

export function commentFloorPage<T>(roots: T[], requestedPage: number, order: 'oldest' | 'newest') {
  const totalPages = Math.max(1, Math.ceil(roots.length / COMMENT_FLOORS_PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, Math.trunc(requestedPage) || 1));
  // In newest-first mode the first page takes the remainder, so the oldest
  // page always holds a full six floors when at least six floors exist.
  const offset = order === 'newest'
    ? Math.max(0, roots.length - (totalPages - page + 1) * COMMENT_FLOORS_PER_PAGE)
    : (page - 1) * COMMENT_FLOORS_PER_PAGE;
  const end = order === 'newest'
    ? roots.length - (totalPages - page) * COMMENT_FLOORS_PER_PAGE
    : offset + COMMENT_FLOORS_PER_PAGE;
  return {
    page,
    totalPages,
    floors: roots.slice(offset, end).map((comment, index) => ({
      comment,
      floor: order === 'oldest' ? offset + index + 1 : roots.length - offset - index,
    })),
  };
}

export function commentPageForId<T extends { id: number; children?: T[] }>(roots: T[], commentId: number, order: 'oldest' | 'newest'): number | null {
  const contains = (comment: T): boolean => comment.id === commentId || !!comment.children?.some(contains);
  const rootIndex = roots.findIndex(contains);
  if (rootIndex < 0) return null;
  if (order === 'oldest') return Math.floor(rootIndex / COMMENT_FLOORS_PER_PAGE) + 1;
  const totalPages = Math.ceil(roots.length / COMMENT_FLOORS_PER_PAGE);
  return totalPages - Math.floor((roots.length - rootIndex - 1) / COMMENT_FLOORS_PER_PAGE);
}
