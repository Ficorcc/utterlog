'use client';

/** ShanYing · 404 */

import Link from '@/components/AppLink';
import { currentSeason, seasonImageUrl } from './shanying-scene';

export default function NotFoundPage() {
  return (
    <div className="sy-notfound">
      <div className="sy-notfound-scene" aria-hidden="true">
        <img src={seasonImageUrl(currentSeason())} alt="" loading="eager" decoding="async" />
        <span className="sy-hero-veil" />
      </div>
      <div className="sy-notfound-copy">
        <p className="sy-kicker">404 · NOT FOUND</p>
        <h1>这座山头没有路</h1>
        <p>你访问的页面不存在，或者已经被移动到别处了。</p>
        <div className="sy-notfound-actions">
          <Link prefetch={false} href="/" className="sy-btn sy-btn--solid">回到首页</Link>
          <Link prefetch={false} href="/archives" className="sy-btn">翻翻归档</Link>
        </div>
      </div>
    </div>
  );
}
