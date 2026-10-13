import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="blog-shell ember-shell"><Header /><main className="blog-main ember-main"><div className="ember-frame">{children}</div><Footer /></main></div>;
}
