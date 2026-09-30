import Header from './Header';
import Footer from './Footer';
import BackToTop from './BackToTop';
import ContextMenu from './ContextMenu';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-shell sy-theme">
      <Header />
      <main className="blog-main sy-main">
        <div className="sy-frame">{children}</div>
        <Footer />
      </main>
      <BackToTop />
      <ContextMenu />
    </div>
  );
}
