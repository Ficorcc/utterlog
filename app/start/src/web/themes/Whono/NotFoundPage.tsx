import Link from '@/components/AppLink';

export default function NotFoundPage() {
  return (
    <div className="wh-404">
      <p className="wh-404-code">404</p>
      <h1 className="wh-404-title">这一页走丢了</h1>
      <p className="wh-404-desc">你要找的内容可能已经被移动或者删掉了。</p>
      <nav className="wh-pagination">
        <Link className="wh-page-link" href="/">
          ‹ 回到首页
        </Link>
      </nav>
    </div>
  );
}
