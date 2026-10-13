'use client';

import { useThemeContext } from '@/lib/theme-context';

export default function Footer() {
  const { site, options } = useThemeContext();
  return <footer className="ember-footer"><div className="ember-footer-mark">✦</div><div><strong>{site.title || 'Utterlog'}</strong><p>把日常写成一封缓慢抵达的信。</p></div><div className="ember-footer-meta"><span>© {new Date().getFullYear()}</span>{options?.beian_icp && <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{options.beian_icp}</a>}</div></footer>;
}
