import Link from '@/components/AppLink';

/**
 * 404 页：对照上游 inc/error-404.php。
 *
 *   .error-page
 *     h1        404
 *     p         提示文案
 *     p > a.btn 回到首页
 */
export default function NotFoundPage() {
  return (
    <div className="error-page">
      <h1>404</h1>
      <p>页面不存在</p>
      <p>
        <Link className="btn" href="/" prefetch={false}>
          <i className="fa-solid fa-house" aria-hidden="true" /> 回到首页
        </Link>
      </p>
    </div>
  );
}
