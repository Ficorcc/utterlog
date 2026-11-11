import Header from './Header';
import Footer from './Footer';
import BackToTop from './BackToTop';
import JieqiNotice from './JieqiNotice';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-shell sy-theme">
      <Header />
      <main className="blog-main sy-main">
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
