'use client';

import FootprintsClient from '@/app/(blog)/footprints/FootprintsClient';
import { getThemeComponents } from '@/lib/theme';
import { normalizeThemeName } from '@shared/blog-theme';
import type { RoutePageData } from '@/lib/route-page-data';
import type { UtterlogBoot } from './types';

/** Bun SSR 注入的 #utterlog-page 静态 HTML 不会水合；带 pageData 的路由在客户端整页重挂。 */
export default function RouteLive({ boot }: { boot?: unknown }) {
  if (!boot || typeof boot !== 'object') return null;
  const typedBoot = boot as UtterlogBoot;
  const data = typedBoot.pageData as RoutePageData | undefined;
  if (!data) return null;

  const themeName = normalizeThemeName(typedBoot.ctx.theme.name);
  const theme = getThemeComponents(themeName);

  if (data.kind === 'home') {
    const { kind: _kind, ...homeProps } = data;
    return <theme.HomePage {...homeProps} />;
  }

  if (data.kind === 'post') {
    return <theme.PostPage post={data.post} options={data.options} />;
  }

  if (data.kind === 'footprints') {
    return <FootprintsClient initialRows={data.initialRows} options={data.options} />;
  }

  return null;
}
