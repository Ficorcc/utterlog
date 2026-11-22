'use client';

import { useThemeContext } from '@/lib/theme-context';
import { appearanceFromOptions, GLAZE_PALETTE_KEYS } from './utils';
import Header from './Header';
import Footer from './Footer';

/**
 * Glaze 骨架。
 *
 * 上游是「顶栏 + 底部固定 dock + 居中窄栏 + 侧轨」的结构：
 *   - header.site-header 独立于内容栏（两者共用同一条宽度约束）
 *   - div.site-layout > main#content.site-content 承载页面内容
 *   - 首页侧轨（div.home-rails）由 HomePage 在内容之后渲染
 *
 * 站点的滚动容器是 .blog-main（body 不滚动，见 web/styles/globals.css），
 * 这里把整个页面外壳放进该容器；上游的 .site-header 是普通流式元素，
 * 会跟着内容一起滚动，行为与上游一致。
 *
 * 根元素上的 data-glaze-* 属性（配色 / 深浅色 / 背景 / 圆角 / 内容宽度）
 * 必须在首帧之前落到 <html> 上，否则会先亮一下再变。这里用一段同步内联脚本
 * 完成：优先取访客上次选择（localStorage），没有则用后台配置的默认值。
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { options } = useThemeContext();
  const appearance = appearanceFromOptions(options);

  const bootstrap = [
    '(function(){try{',
    'var s=JSON.parse(document.getElementById("glaze-appearance").textContent);',
    'try{var p=localStorage.getItem("glaze-palette");if(p)s.palette=p;}catch(e){}',
    'try{var m=localStorage.getItem("glaze-scheme");if(m==="dark"||m==="light")s.scheme=m;}catch(e){}',
    'var d=document.documentElement;',
    'd.setAttribute("data-glaze-palette",s.palette);',
    `d.setAttribute("data-glaze-palettes","${GLAZE_PALETTE_KEYS.join(' ')}");`,
    'd.setAttribute("data-glaze-scheme",s.scheme);',
    'd.setAttribute("data-glaze-background",s.background);',
    'd.setAttribute("data-glaze-corners",s.corners);',
    'd.setAttribute("data-glaze-content-width",s.contentWidth);',
    '}catch(e){}})();',
  ].join('');

  return (
    <div className="glaze-shell">
      <script
        id="glaze-appearance"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appearance) }}
      />
      <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
      {appearance.background !== 'none' ? <div className="glaze-light-ripples" aria-hidden="true" /> : null}
      <div className="blog-main glaze-main">
        <Header />
        <div className="site-layout">
          <main id="content" className="site-content">
            {children}
          </main>
        </div>
        <Footer />
      </div>
    </div>
  );
}
