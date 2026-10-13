'use client';

import Link from '@/components/AppLink';
import { usePathname } from '@/lib/navigation';
import { useState } from 'react';
import { useThemeContext } from '@/lib/theme-context';
import type { MenuItem } from '@/lib/theme-context';

function DesktopMenuItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const children = item.children || [];
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  return <div className="ember-nav-item">
    <Link prefetch={false} href={item.href} target={item.target} className={active ? 'active' : ''}>{item.label}{children.length > 0 && <span className="ember-nav-chevron" aria-hidden="true">⌄</span>}</Link>
    {children.length > 0 && <div className="ember-nav-dropdown">{children.map((child) => <DesktopMenuItem key={`${child.href}-${child.label}`} item={child} pathname={pathname} />)}</div>}
  </div>;
}

function MobileMenuItem({ item, close }: { item: MenuItem; close: () => void }) {
  const children = item.children || [];
  return <div className="ember-mobile-item">
    <Link prefetch={false} href={item.href} target={item.target} onClick={close}>{item.label}</Link>
    {children.length > 0 && <div className="ember-mobile-children">{children.map((child) => <MobileMenuItem key={`${child.href}-${child.label}`} item={child} close={close} />)}</div>}
  </div>;
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { menus, site, options } = useThemeContext();
  const navItems = menus.header ?? [];
  const siteName = site.title || 'Utterlog';
  const mode = options?.site_brand_mode || (site.logo ? 'logo' : 'text');
  const showLogo = (mode === 'logo' || mode === 'text_logo') && Boolean(site.logo);
  const showText = mode !== 'logo' || !site.logo;
  return <header className="ember-header"><div className="ember-header-inner">
    <Link prefetch={false} href="/" className="ember-brand">{showLogo && <img src={site.logo} alt={showText ? '' : siteName} />}{showText && <span>{siteName}</span>}</Link>
    <nav className="ember-nav" aria-label="主导航">{navItems.map((item) => <DesktopMenuItem key={`${item.href}-${item.label}`} item={item} pathname={pathname} />)}</nav>
    <button className="ember-menu" type="button" aria-label="切换导航" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /><span /></button>
  </div>{open && <nav className="ember-mobile-nav" aria-label="移动端导航">{navItems.map((item) => <MobileMenuItem key={`${item.href}-${item.label}`} item={item} close={() => setOpen(false)} />)}</nav>}</header>;
}
