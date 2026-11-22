import Link from '@/components/AppLink';

/**
 * 404 页。
 *
 *   section.page-heading.glaze-panel.error-page
 *     h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
 *     p
 *     form[role=search].search-form
 *       label.screen-reader-text
 *       input.search-field[type=search][name=q]
 *       button.search-submit.control-button
 *     a.control-button[href=/] 回到首页
 *
 * 搜索表单提交到站点的 /search，参数名是 q（见 routes/search.tsx）。
 */
export default function NotFoundPage() {
  return (
    <section className="page-heading glaze-panel error-page">
      <h1 className="glaze-page-title">
        <span className="glaze-page-title-icon squircle" aria-hidden="true">
          <span className="glaze-icon" data-glaze-icon="misc" />
        </span>
        <span>404</span>
      </h1>
      <p>页面不存在，可能已经被删除，或者地址写错了。</p>

      <form className="search-form" role="search" action="/search" method="get">
        <label className="screen-reader-text" htmlFor="glaze-notfound-search">
          搜索文章
        </label>
        <input
          className="search-field"
          id="glaze-notfound-search"
          type="search"
          name="q"
          placeholder="搜索文章、关键词或标题"
        />
        <button className="search-submit control-button" type="submit">
          搜索
        </button>
      </form>

      <Link className="control-button" href="/" prefetch={false}>
        回到首页
      </Link>
    </section>
  );
}
