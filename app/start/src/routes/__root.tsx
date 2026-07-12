import type { ReactNode } from 'react';
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { blogThemeAccentAttr } from '@shared/blog-theme';
import type { ThemeContextData } from '@/lib/theme-context';
import { getThemeComponents } from '@/lib/theme';
import { DefaultNotFoundPage } from '@/components/blog/defaults';
import { StartThemeShell } from '../components/StartThemeShell';
import { loadStartDocument } from '../server/document';
import { startDocumentLinks } from '../lib/document';

export const Route = createRootRoute({
  loader: () => loadStartDocument(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: loaderData?.site.subtitle ? `${loaderData.site.title} - ${loaderData.site.subtitle}` : loaderData?.site.title || 'Utterlog' },
      {
        name: 'description',
        content: loaderData?.site.description || '',
      },
    ],
    links: startDocumentLinks(loaderData),
  }),
  component: RootComponent,
  notFoundComponent: StartNotFound,
});

function StartNotFound() {
  const ctx = Route.useLoaderData();
  if (ctx) {
    const theme = getThemeComponents(ctx.theme.name);
    const NotFoundPage = theme.NotFoundPage || DefaultNotFoundPage;
    return <StartThemeShell ctx={ctx}><NotFoundPage /></StartThemeShell>;
  }
  return (
    <main className="start-shell">
      <p className="eyebrow">404</p>
      <h1>页面不存在</h1>
      <Link to="/" className="text-link">返回首页</Link>
    </main>
  );
}

function RootComponent() {
  const ctx = Route.useLoaderData();
  return (
    <RootDocument ctx={ctx}>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children, ctx }: Readonly<{ children: ReactNode; ctx: ThemeContextData | null }>) {
  const accent = blogThemeAccentAttr(ctx?.theme.accent || 'blue');
  return (
    <html
      lang={ctx?.locale || 'zh-CN'}
      data-theme={ctx?.theme.name}
      data-accent={accent || undefined}
      data-timezone={ctx?.timeZone || 'UTC'}
    >
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased bg-page text-primary">
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <clipPath id="squircle" clipPathUnits="objectBoundingBox">
              <path d="M0.5 0C0.9 0 1 0.1 1 0.5 1 0.9 0.9 1 0.5 1 0.1 1 0 0.9 0 0.5 0 0.1 0.1 0 0.5 0Z" />
            </clipPath>
          </defs>
        </svg>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
