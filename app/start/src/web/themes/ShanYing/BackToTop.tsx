'use client';

/** ShanYing · 返回顶部
 *
 * 原主题用的是 FontAwesome 实心方块上箭头（fa-square-up），并跟着滚动容器
 * `.blog-main` 而不是 window 判断显隐。
 */

import { useEffect, useState } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scroller = (document.querySelector('.blog-main') as HTMLElement | null) || null;
    const readTop = () => (scroller ? scroller.scrollTop : window.scrollY);
    let frame = 0;
    const read = () => {
      frame = 0;
      setVisible(readTop() > 480);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    (scroller || window).addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      (scroller || window).removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const toTop = () => {
    const scroller = document.querySelector('.blog-main') as HTMLElement | null;
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      className="sy-top"
      data-visible={visible ? '1' : undefined}
      aria-label="返回顶部"
      title="返回顶部"
      onClick={toTop}
    >
      <i className="fa-solid fa-square-up" aria-hidden="true" />
    </button>
  );
}
