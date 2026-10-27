'use client';

import { useState } from 'react';
import PageTitle from '@/components/blog/PageTitle';
import CommentList from './CommentList';

export default function GuestbookPage({ postId, commentCount }: { postId: number; commentCount: number }) {
  const [count, setCount] = useState(commentCount);
  return (
    <div className="azure-guestbook" id="guestbook">
      <PageTitle title="留言板" icon="fa-regular fa-message-lines" subtitle="欢迎留下你的想法" meta={<><strong>{count}</strong> 条留言</>} />
      <div className="azure-guestbook-body">
        <header className="azure-guestbook-intro">
          <span className="azure-guestbook-intro-icon" aria-hidden="true"><i className="fa-regular fa-pen-to-square" /></span>
          <div>
            <h2>来聊聊吧</h2>
            <p>关于文章、生活，或只是打个招呼，都可以写在这里。留言和回复会在下方持续保留。</p>
          </div>
        </header>
        <section className="azure-guestbook-comments" aria-label="留言与回复">
          <CommentList postId={postId} title="留言板" onCommentCountChange={setCount} formPlacement="bottom" />
        </section>
      </div>
    </div>
  );
}
