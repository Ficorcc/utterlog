import Header from './Header';
import Footer from './Footer';
import BackToTop from './BackToTop';
import JieqiNotice from './JieqiNotice';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-shell sy-theme">
      <main className="blog-main sy-main">
        {/* 页头放滚动容器内（sticky）：百分比宽度与 .sy-frame/.sy-footer-inner
            同源，页头/内容/页脚内容列在所有断点严格同宽对齐。 */}
        <Header />
        <div className="sy-frame">{children}</div>
        {/* 页脚放 frame 外：背景通栏（100vw），内容列由 .sy-footer-inner
            收回到与页头/正文同一 frame 宽度。 */}
        <Footer />
      </main>
      <BackToTop />
      <JieqiNotice />
    </div>
  );
}
