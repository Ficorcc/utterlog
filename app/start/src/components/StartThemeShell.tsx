import type { ReactNode } from 'react';
import { Providers } from '@/app/providers';
import { ThemeProvider, type ThemeContextData } from '@/lib/theme-context';
import { getThemeComponents } from '@/lib/theme';
import { SlotFooter, SlotHead } from '@/lib/slots';
import PageViewTracker from '@/components/blog/PageViewTracker';
import ImageEffects from '@/components/blog/ImageEffects';
import AIChatBubble from '@/components/blog/AIChatBubble';

export function StartThemeShell({
  ctx,
  children,
}: {
  ctx: ThemeContextData;
  children: ReactNode;
}) {
  const theme = getThemeComponents(ctx.theme.name);
  const ThemeLayout = theme.Layout;

  return (
    <Providers>
      <ThemeProvider value={ctx}>
        <div data-theme={ctx.theme.name} data-accent={ctx.theme.accent || undefined}>
          <link rel="stylesheet" href={`/themes/${ctx.theme.name}/styles.css?v=${ctx.theme.manifest?.version || '0'}`} />
          <SlotHead options={ctx.options} />
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
        </div>
      </ThemeProvider>
    </Providers>
  );
}
