/**
 * Theme System — Dynamic theme loading and management
 *
 * Built-in theme source lives in app/web/themes/{ThemeName}/ and is statically
 * imported for TanStack Start SSR. Runtime-uploaded theme packages live in the API
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

// Built-in blog themes rendered by TanStack Start.
import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import {
  DEFAULT_BLOG_THEME,
  blogThemeAccentAttr,
  normalizeThemeName,
  resolveBlogTheme,
  type BlogThemeAccent,
} from '@shared/blog-theme';
import AzureManifest from '@/themes/Azure/theme.json';
import RenascentManifest from '@/themes/Renascent/theme.json';
import ShanYingManifest from '@/themes/ShanYing/theme.json';

type ThemeComponent<Props = any> = ComponentType<Props> | LazyExoticComponent<ComponentType<Props>>;

export interface ThemeComponents {
  Header: ThemeComponent;
  Footer: ThemeComponent;
  HomePage: ThemeComponent;
  PostPage: ThemeComponent<{ post: any; options?: Record<string, string> }>;
  PostCard: ThemeComponent<{ post: any }>;
  CommentSection: ThemeComponent<{ postId: number }>;
  Layout: ThemeComponent<{ children: ReactNode }>;
  ArchivePage?: ThemeComponent;
  CategoryPage?: ThemeComponent;
  TagPage?: ThemeComponent;
  CategoriesPage?: ThemeComponent;
  TagsPage?: ThemeComponent;
  NotFoundPage?: ThemeComponent;
  DashboardPage?: ThemeComponent;
}

const SharedCommentSection = lazy(() => import('@/components/blog/CommentList'));

// Keep theme modules out of the common hydration bundle. Only the selected
// theme and current page type are downloaded by the browser.
const Azure: ThemeComponents = {
  Header: lazy(() => import('@/themes/Azure/Header')),
  Footer: lazy(() => import('@/themes/Azure/Footer')),
  Layout: lazy(() => import('@/themes/Azure/Layout')),
  HomePage: lazy(() => import('@/themes/Azure/HomePage')),
  PostPage: lazy(() => import('@/themes/Azure/PostPage')),
  PostCard: lazy(() => import('@/themes/Azure/PostCard')),
  CommentSection: SharedCommentSection,
};

const Renascent: ThemeComponents = {
  Header: lazy(() => import('@/themes/Renascent/Header')),
  Footer: lazy(() => import('@/themes/Renascent/Footer')),
  Layout: lazy(() => import('@/themes/Renascent/Layout')),
  HomePage: lazy(() => import('@/themes/Renascent/HomePage')),
  PostPage: lazy(() => import('@/themes/Renascent/PostPage')),
  PostCard: lazy(() => import('@/themes/Renascent/PostCard')),
  CommentSection: lazy(() => import('@/themes/Renascent/PostInteractive').then((module) => ({ default: module.CommentSection }))),
};

const ShanYing: ThemeComponents = {
  Header: lazy(() => import('@/themes/ShanYing/Header')),
  Footer: lazy(() => import('@/themes/ShanYing/Footer')),
  Layout: lazy(() => import('@/themes/ShanYing/Layout')),
  HomePage: lazy(() => import('@/themes/ShanYing/HomePage')),
  PostPage: lazy(() => import('@/themes/ShanYing/PostPage')),
  PostCard: lazy(() => import('@/themes/ShanYing/PostCard')),
  CommentSection: SharedCommentSection,
  ArchivePage: lazy(() => import('@/themes/ShanYing/ArchivePage')),
  CategoryPage: lazy(() => import('@/themes/ShanYing/CategoryPage')),
  TagPage: lazy(() => import('@/themes/ShanYing/TagPage')),
  CategoriesPage: lazy(() => import('@/themes/ShanYing/CategoriesPage')),
  TagsPage: lazy(() => import('@/themes/ShanYing/TagsPage')),
  NotFoundPage: lazy(() => import('@/themes/ShanYing/NotFoundPage')),
  DashboardPage: lazy(() => import('@/themes/ShanYing/DashboardPage')),
};

const themeRegistry: Record<string, ThemeComponents> = {
  Azure,
  Renascent,
  ShanYing,
};

const manifestRegistry: Record<string, ThemeManifest> = {
  Azure: AzureManifest as ThemeManifest,
  Renascent: RenascentManifest as ThemeManifest,
  ShanYing: ShanYingManifest as ThemeManifest,
};

export { DEFAULT_BLOG_THEME, blogThemeAccentAttr, normalizeThemeName, resolveBlogTheme, type BlogThemeAccent };

export function getThemeComponents(themeName: string): ThemeComponents {
  const name = normalizeThemeName(themeName);
  // Start the home chunk alongside Layout instead of waiting for Layout's
  // Suspense boundary to resolve. Other themes/routes keep their lazy chunks.
  if (name === 'ShanYing' && typeof window !== 'undefined' && window.location.pathname === '/') {
    void import('@/themes/ShanYing/HomePage').catch(() => {});
  }
  return themeRegistry[name] || themeRegistry[DEFAULT_BLOG_THEME];
}

export function getThemeManifest(themeName: string): ThemeManifest {
  const name = normalizeThemeName(themeName);
  return manifestRegistry[name] || manifestRegistry[DEFAULT_BLOG_THEME];
}

export const DEFAULT_THEME = DEFAULT_BLOG_THEME;

export function getAvailableThemes(): string[] {
  return Object.keys(themeRegistry);
}
