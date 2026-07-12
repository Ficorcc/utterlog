import type { ReactNode } from 'react';
import { Providers } from '@/app/providers';
import { ThemeProvider, type ThemeContextData } from '@/lib/theme-context';
import { getThemeComponents } from '@/lib/theme';
import { SlotFooter, SlotHead } from '@/lib/slots';
import PageViewTracker from '@/components/blog/PageViewTracker';
import ImageEffects from '@/components/blog/ImageEffects';
import AIChatBubble from '@/components/blog/AIChatBubble';
import Script from '../../../blog/src/shims/script';
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
          <Script src="https://id.utterlog.com/static/passport.js" strategy="lazyOnload" />
          <ThemeLayout>
            <PageViewTracker />
            <ImageEffects
              effect={ctx.options.image_display_effect}
              durationMs={ctx.options.image_display_duration}
              lazyLoad={ctx.options.image_lazy_load}
              lightbox={ctx.options.image_lightbox}
            />
            {children}
          </ThemeLayout>
          <AIChatBubble />
          <SlotFooter options={ctx.options} />
        </ThemeProvider>
      </Providers>
    </NavigationProvider>
  );
}
