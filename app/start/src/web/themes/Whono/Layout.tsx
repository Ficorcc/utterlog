import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

/**
 * 双栏壳：侧栏 | 1px 分隔线 | 正文。
 * 网格容器必须把 Header / divider / main 放成同级，才能让侧栏 sticky 生效。
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="wh-shell">
      <Header />
      <div className="wh-divider" aria-hidden="true" />
      <main id="wh-main" className="wh-content" tabIndex={-1}>
        <div className="wh-content-inner">
          {children}
          <Footer />
        </div>
      </main>
    </div>
  );
}
