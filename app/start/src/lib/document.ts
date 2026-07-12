import type { ThemeContextData } from '@/lib/theme-context';

export type DocumentLink = {
  rel: string;
  href: string;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
};

export function startDocumentLinks(ctx: ThemeContextData | null | undefined): DocumentLink[] {
  return [
    { rel: 'icon', href: ctx?.site.favicon || '/favicon.ico' },
    { rel: 'preconnect', href: 'https://static.bluecdn.com', crossOrigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://static.bluecdn.com/libs/fontawesome/7.3.0/css/all.min.css' },
    { rel: 'stylesheet', href: 'https://static.bluecdn.com/fonts/noto-sans-sc.css' },
    { rel: 'stylesheet', href: 'https://static.bluecdn.com/fonts/alimama-fangyuanti.css' },
    { rel: 'stylesheet', href: 'https://static.bluecdn.com/fonts/luo.css' },
    ...(ctx ? [{ rel: 'stylesheet', href: `/themes/${ctx.theme.name}/styles.css?v=${ctx.theme.manifest?.version || '0'}` }] : []),
  ];
}
