'use client';

import Link from '@/components/AppLink';
import { useThemeContext } from '@/lib/theme-context';

export default function Footer() {
  const { site, owner, menus } = useThemeContext();
  const year = new Date().getFullYear();
  const siteName = site.title || 'Utterlog';
  const footerItems = menus.footer || [];

  return (
    <>
      <footer className="renascent-footer">
        <div className="renascent-container renascent-footer-inner">
          <div>
            <Link prefetch={false} href="/" className="renascent-footer-brand">Renascent·@{siteName}</Link>
            {owner.bio && <p className="renascent-footer-bio">{owner.bio}</p>}
          </div>
          <div className="renascent-footer-links">
            {footerItems.map(item => (
              <Link prefetch={false} key={`${item.href}-${item.label}`} href={item.href || '#'}>{item.label}</Link>
            ))}
            <a href="/feed">RSS</a>
            <a href="https://utterlog.com" target="_blank" rel="noopener noreferrer">Utterlog</a>
          </div>
          <div className="renascent-footer-meta">
            © {year} {siteName}
          </div>
        </div>
      </footer>
    </>
  );
}
