'use client';

import { useThemeContext } from '@/lib/theme-context';

export default function Footer() {
  const { site, owner, options } = useThemeContext();
  const socials = Object.entries(owner?.socials || {}).filter(([, value]) => Boolean(value));
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-copy">
        © {year} {site?.title || 'Utterlog'}.
      </div>
      <div className="footer-socials">
        <a href="/rss.xml" className="footer-social footer-rss-copy" title="RSS" aria-label="RSS">
          <i className="fa-solid fa-square-rss" aria-hidden="true" />
        </a>
        {socials.map(([key, url]) => (
          <a
            key={key}
            href={url}
            className="footer-social"
            title={key}
            aria-label={key}
            target="_blank"
            rel="nofollow noopener"
          >
            <i className="fa-solid fa-link" aria-hidden="true" />
          </a>
        ))}
        {options?.beian_icp ? (
          <a
            href="https://beian.miit.gov.cn/"
            className="footer-social"
            title={options.beian_icp}
            aria-label={options.beian_icp}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </footer>
  );
}
