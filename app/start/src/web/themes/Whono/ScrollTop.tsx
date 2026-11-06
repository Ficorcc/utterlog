import { useEffect, useState } from 'react';

/**
 * 回到顶部浮动按钮（对齐 astro-whono 原版的 .float-action.scroll-top）：
 * 滚动超过一屏后淡入，点击平滑回顶。
 * 滚动发生在右侧正文列（.wh-content，即 .blog-main 滚动容器），
 * 兼容降级到 window（窄屏等场景）。
 */
export default function ScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.querySelector('.wh-content') as HTMLElement | null;
    const getTop = () => (container ? container.scrollTop : window.scrollY);
    const onScroll = () => setVisible(getTop() > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    container?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      container?.removeEventListener('scroll', onScroll);
    };
  }, []);

  const backToTop = () => {
    const container = document.querySelector('.wh-content') as HTMLElement | null;
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      className="wh-float-action"
      data-visible={visible ? 'true' : 'false'}
      aria-label="回到顶部"
      onClick={backToTop}
    >
      <svg className="wh-float-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
