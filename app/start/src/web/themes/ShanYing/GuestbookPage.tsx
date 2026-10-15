'use client';

import { useState } from 'react';
import PageTitle from '@/components/blog/PageTitle';
import CommentList from '@/components/blog/CommentList';

export default function GuestbookPage({ postId, commentCount }: { postId: number; commentCount: number }) {
  const [count, setCount] = useState(commentCount);
  return (
    <div className="sy-guestbook" id="guestbook">
      <PageTitle title="留言板" icon="fa-regular fa-message-lines" className="sy-guestbook-title" meta={<><strong>{count}</strong> 条留言</>} />
      <div className="sy-guestbook-intro">
        <p className="sy-kicker">SAY HELLO</p>
        <h2>路过时，留下一句话。</h2>
        <p>关于这里的文章、路上的风景，或是今天的心情，都欢迎写下来。每一句留言都能在这里继续对话。</p>
      </div>
      <section className="sy-comments sy-guestbook-comments" aria-label="留言与回复">
        <CommentList postId={postId} title="留言板" onCommentCountChange={setCount} />
      </section>
    </div>
  );
}
