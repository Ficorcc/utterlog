'use client';

import type { ReactNode } from 'react';
import { useThemeContext } from '@/lib/theme-context';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import useCardReveal from './useCardReveal';

/**
 * Robes 的骨架：光晕背景 + 一张玻璃卡片，卡片里是「顶栏 / 侧栏 + 内容区 / 底栏」。
 *
 * DOM 层级严格对齐原 Typecho 模板（header.php → index.php → footer.php），
 * 因为样式表是按这套层级写的：
 *   .page > .shell.glass > (.topbar, .main-body > (.sidebar, .content-area), .bottom-bar)
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { options } = useThemeContext();
  const accent = String(options?.robes_accent || '').trim();

  useCardReveal();

  return (
    <>
      {/* 深色模式必须在首帧之前落到 <html> 上，否则浅色闪一下再变暗。
          主题名占用 data-theme，这里用独立的 data-robes-mode。 */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var m=localStorage.getItem('robes-mode');" +
            "document.documentElement.dataset.robesMode=(m==='dark'||m==='light')?m:" +
            "(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');" +
            '}catch(e){}',
        }}
      />

      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <div className="page">
        <div className="shell glass" style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}>
          <Header />
          <div className="main-body">
            <Sidebar />
            <div className="content-area">
              <div className="fade-top" aria-hidden="true" />
              <div className="content-inner">
                <div className="content-scroll" id="feed">
                  {children}
                </div>
              </div>
              <div className="fade-bottom" aria-hidden="true" />
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
}
