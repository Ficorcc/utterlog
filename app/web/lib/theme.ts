/**
 * Theme System — Dynamic theme loading and management
 *
 * Built-in theme source lives in app/web/themes/{ThemeName}/ and is statically
 * imported for Next.js SSR. Runtime-uploaded theme packages live in the API
 * container under content/themes/{ThemeName}/; their public assets are served
 * from /themes/{ThemeName}/...
 *
 * Active theme is stored in the database options table (key: "active_theme")
 */

export interface MenuPosition {
  key: string;
  label: string;
  description?: string;
}

export interface ThemeManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  screenshot?: string;
  colors?: {
    primary?: string;
    background?: string;
  };
  layout?: {
    maxWidth?: string;
    headerStyle?: string;
  };
  menuPositions?: MenuPosition[];
  features?: string[];
}

// Built-in blog themes shared by the legacy renderer and TanStack Start.
import type { ComponentType, ReactNode } from 'react';
import {
  DEFAULT_BLOG_THEME,
  blogThemeAccentAttr,
  normalizeThemeName,
  resolveBlogTheme,
  type BlogThemeAccent,
} from '@shared/blog-theme';
import * as Azure from '@/themes/Azure';
import * as Flux from '@/themes/Flux';
import * as Nebula from '@/themes/Nebula';
import * as Renascent from '@/themes/Renascent';
import * as Utterlog from '@/themes/Utterlog';
import AzureManifest from '@/themes/Azure/theme.json';
import FluxManifest from '@/themes/Flux/theme.json';
import NebulaManifest from '@/themes/Nebula/theme.json';
import RenascentManifest from '@/themes/Renascent/theme.json';
import UtterlogManifest from '@/themes/Utterlog/theme.json';

export interface ThemeComponents {
  Header: ComponentType<any>;
  Footer: ComponentType<any>;
  HomePage: ComponentType<any>;
  PostPage: ComponentType<{ post: any; options?: Record<string, string> }>;
  PostCard: ComponentType<{ post: any }>;
  CommentSection: ComponentType<{ postId: number }>;
  Layout: ComponentType<{ children: ReactNode }>;
  ArchivePage?: ComponentType<any>;
  CategoryPage?: ComponentType<any>;
  TagPage?: ComponentType<any>;
  CategoriesPage?: ComponentType<any>;
  TagsPage?: ComponentType<any>;
  NotFoundPage?: ComponentType<any>;
}

const themeRegistry: Record<string, ThemeComponents> = {
  Azure: Azure as unknown as ThemeComponents,
  Flux: Flux as unknown as ThemeComponents,
  Nebula: Nebula as unknown as ThemeComponents,
  Renascent: Renascent as unknown as ThemeComponents,
  Utterlog: Utterlog as unknown as ThemeComponents,
};

const manifestRegistry: Record<string, ThemeManifest> = {
  Azure: AzureManifest as ThemeManifest,
  Flux: FluxManifest as ThemeManifest,
  Nebula: NebulaManifest as ThemeManifest,
  Renascent: RenascentManifest as ThemeManifest,
  Utterlog: UtterlogManifest as ThemeManifest,
};

export { DEFAULT_BLOG_THEME, blogThemeAccentAttr, normalizeThemeName, resolveBlogTheme, type BlogThemeAccent };

export function getThemeComponents(themeName: string): ThemeComponents {
  const name = normalizeThemeName(themeName);
  return themeRegistry[name] || themeRegistry[DEFAULT_BLOG_THEME];
}

export function getThemeManifest(themeName: string): ThemeManifest {
  const name = normalizeThemeName(themeName);
  return manifestRegistry[name] || manifestRegistry[DEFAULT_BLOG_THEME];
}

export const DEFAULT_THEME = DEFAULT_BLOG_THEME;

export function getAllManifests(): Record<string, ThemeManifest> {
  return manifestRegistry;
}

export function getAvailableThemes(): string[] {
  return Object.keys(themeRegistry);
}
