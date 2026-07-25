import { Suspense, type ReactNode } from 'react';
import { Providers } from '@/components/AppProviders';
import LazyScript from '@/components/LazyScript';
import { ThemeProvider, type ThemeContextData } from '@/lib/theme-context';
import { getThemeComponents } from '@/lib/theme';
import { SlotFooter, SlotHead } from '@/lib/slots';
import PageViewTracker from '@/components/blog/PageViewTracker';
import NavigationProgress from '@/components/blog/NavigationProgress';
import AIChatBubble from '@/components/blog/AIChatBubble';
import { NavigationProvider } from '@/lib/navigation';
import { useRouterState } from '@tanstack/react-router';

export function StartThemeShell({
  ctx,
  children,
}: {
  ctx: ThemeContextData;
  children: ReactNode;
}) {
  const theme = getThemeComponents(ctx.theme.name);
  const ThemeLayout = theme.Layout;
  const location = useRouterState({ select: (state) => state.location });
  const searchParams = Object.fromEntries(new URLSearchParams(location.searchStr));

  return (
    <NavigationProvider pathname={location.pathname} searchParams={searchParams}>
      <Providers>
        <ThemeProvider value={ctx}>
          <SlotHead options={ctx.options} />
          <LazyScript src="https://id.utterlog.com/static/passport.js" strategy="lazyOnload" />
          {/* 必须在 Suspense 外：放里面的话 pending 期间会被 fallback
              一起替换掉，正好在最需要它的时候消失。 */}
          <NavigationProgress />
          <Suspense fallback={<main style={{ minHeight: '100vh' }} aria-busy="true" />}>
            <ThemeLayout>
              <PageViewTracker />
              {children}
            </ThemeLayout>
          </Suspense>
          <AIChatBubble />
          <SlotFooter options={ctx.options} />
        </ThemeProvider>
      </Providers>
    </NavigationProvider>
  );
}
