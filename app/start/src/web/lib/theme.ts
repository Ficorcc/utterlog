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
import EmberManifest from '@/themes/Ember/theme.json';
import RenascentManifest from '@/themes/Renascent/theme.json';
import RobesManifest from '@/themes/Robes/theme.json';
import ShanYingManifest from '@/themes/ShanYing/theme.json';
import WhonoManifest from '@/themes/Whono/theme.json';

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
  GuestbookPage?: ThemeComponent<{ postId: number; commentCount: number; commentAuthors?: number; lastCommentAt?: number }>;
  /** 主题可以接管「关于」页；不提供时回落到应用层默认的 AboutContent。 */
  AboutPage?: ThemeComponent<{ recentPosts?: any[] }>;
  /** 主题可以接管「友链」页；不提供时回落到应用层默认的 LinksClient。 */
  LinksPage?: ThemeComponent<{ initialLinks?: any[]; initialOptions?: Record<string, string> }>;
  /**
   * 主题可以接管「朋友圈」页（友链动态聚合）。
   * 不提供时回落到应用层默认的 FriendsClient。
   */
  FriendsPage?: ThemeComponent<{ friends?: any[]; total?: number; withPosts?: number }>;
  /**
   * 主题可以接管「订阅」页。
   * 数据与朋友圈页同源（友链 + RSS 订阅），但订阅页不铺好友筛选标签栏。
   * 不提供时回落到 FriendsPage（Robes 那样）或应用层默认的 FeedsClient。
   */
  FeedsPage?: ThemeComponent<{ friends?: any[]; total?: number; withPosts?: number }>;
  /**
   * 主题可以接管「说说」页。
   * 不提供时回落到应用层默认的 MomentsClient（散落式瀑布）。
   */
  MomentsPage?: ThemeComponent<{ initialMoments?: any[] }>;
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
  GuestbookPage: lazy(() => import('@/themes/Azure/GuestbookPage')),
};

// Ember 是内置主题：组件与样式表都在 themes/Ember/，styles.css 由
// scripts/sync-ember-theme-css.mjs 从上游生成。
const Ember: ThemeComponents = {
  Header: lazy(() => import('@/themes/Ember/Header')),
  Footer: lazy(() => import('@/themes/Ember/Footer')),
  Layout: lazy(() => import('@/themes/Ember/Layout')),
  HomePage: lazy(() => import('@/themes/Ember/HomePage')),
  PostPage: lazy(() => import('@/themes/Ember/PostPage')),
  PostCard: lazy(() => import('@/themes/Ember/PostCard')),
  CommentSection: SharedCommentSection,
  ArchivePage: lazy(() => import('@/themes/Ember/ArchivePage')),
  CategoryPage: lazy(() => import('@/themes/Ember/CategoryPage')),
  CategoriesPage: lazy(() => import('@/themes/Ember/CategoriesPage')),
  TagPage: lazy(() => import('@/themes/Ember/TagPage')),
  TagsPage: lazy(() => import('@/themes/Ember/TagsPage')),
  AboutPage: lazy(() => import('@/themes/Ember/AboutPage')),
  LinksPage: lazy(() => import('@/themes/Ember/LinksPage')),
  FriendsPage: lazy(() => import('@/themes/Ember/FriendsPage')),
  FeedsPage: lazy(() => import('@/themes/Ember/FeedsPage')),
  MomentsPage: lazy(() => import('@/themes/Ember/MomentsPage')),
  NotFoundPage: lazy(() => import('@/themes/Ember/NotFoundPage')),
  GuestbookPage: lazy(() => import('@/themes/Ember/GuestbookPage')),
  DashboardPage: lazy(() => import('@/themes/Ember/DashboardPage')),
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
  GuestbookPage: lazy(() => import('@/themes/ShanYing/GuestbookPage')),
};

const Robes: ThemeComponents = {
  Header: lazy(() => import('@/themes/Robes/Header')),
  Footer: lazy(() => import('@/themes/Robes/Footer')),
  Layout: lazy(() => import('@/themes/Robes/Layout')),
  HomePage: lazy(() => import('@/themes/Robes/HomePage')),
  PostPage: lazy(() => import('@/themes/Robes/PostPage')),
  PostCard: lazy(() => import('@/themes/Robes/PostCard')),
  CommentSection: SharedCommentSection,
  ArchivePage: lazy(() => import('@/themes/Robes/ArchivePage')),
  CategoryPage: lazy(() => import('@/themes/Robes/CategoryPage')),
  TagPage: lazy(() => import('@/themes/Robes/TagPage')),
  CategoriesPage: lazy(() => import('@/themes/Robes/CategoriesPage')),
  TagsPage: lazy(() => import('@/themes/Robes/TagsPage')),
  NotFoundPage: lazy(() => import('@/themes/Robes/NotFoundPage')),
  GuestbookPage: lazy(() => import('@/themes/Robes/GuestbookPage')),
  AboutPage: lazy(() => import('@/themes/Robes/AboutPage')),
  LinksPage: lazy(() => import('@/themes/Robes/LinksPage')),
  FriendsPage: lazy(() => import('@/themes/Robes/FriendsPage')),
  MomentsPage: lazy(() => import('@/themes/Robes/MomentsPage')),
};

const Whono: ThemeComponents = {
  Header: lazy(() => import('@/themes/Whono/Header')),
  Footer: lazy(() => import('@/themes/Whono/Footer')),
  Layout: lazy(() => import('@/themes/Whono/Layout')),
  HomePage: lazy(() => import('@/themes/Whono/HomePage')),
  PostPage: lazy(() => import('@/themes/Whono/PostPage')),
  PostCard: lazy(() => import('@/themes/Whono/PostCard')),
  CommentSection: SharedCommentSection,
  ArchivePage: lazy(() => import('@/themes/Whono/ArchivePage')),
  CategoryPage: lazy(() => import('@/themes/Whono/CategoryPage')),
  TagPage: lazy(() => import('@/themes/Whono/TagPage')),
  CategoriesPage: lazy(() => import('@/themes/Whono/CategoriesPage')),
  TagsPage: lazy(() => import('@/themes/Whono/TagsPage')),
  NotFoundPage: lazy(() => import('@/themes/Whono/NotFoundPage')),
};

const themeRegistry: Record<string, ThemeComponents> = {
  Azure,
  Ember,
  Renascent,
  Robes,
  ShanYing,
  Whono,
};

const manifestRegistry: Record<string, ThemeManifest> = {
  Azure: AzureManifest as ThemeManifest,
  Ember: EmberManifest as ThemeManifest,
  Renascent: RenascentManifest as ThemeManifest,
  Robes: RobesManifest as ThemeManifest,
  ShanYing: ShanYingManifest as ThemeManifest,
  Whono: WhonoManifest as ThemeManifest,
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
