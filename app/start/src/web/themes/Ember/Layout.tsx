'use client';

import { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';

/**
 * Ember 骨架：上游是「固定导航 + 整页滚动 + 页脚通栏」的布局。
 * 本项目的滚动容器是 .blog-main（body 不滚动），因此：
 *   - 固定导航放在滚动容器之外（保持视口定位）
 *   - .container（自带 116px 顶部留白，用于避让固定导航）放进滚动容器内
 *   - 滚动状态通过 body.nav-scrolled 反馈给上游样式（上游监听的是 body）
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const scroller = document.querySelector('.blog-main') as HTMLElement | null;
    if (!scroller) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      document.body.classList.toggle('nav-scrolled', scroller.scrollTop > 24);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="ember-shell">
      {/* 深浅色必须在首帧前落到根元素上，否则会先亮一下再变暗。
          主题名占用 data-theme，这里用独立的 data-ember-mode。 */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var m=localStorage.getItem('ember-mode');" +
            "document.documentElement.dataset.emberMode=(m==='dark'||m==='light')?m:" +
            "(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');" +
            '}catch(e){}',
        }}
      />
      <Header />
      <main className="blog-main ember-main">
        <div className="container">
          <div className="site-main">{children}</div>
          <Footer />
        </div>
      </main>
    </div>
  );
}
