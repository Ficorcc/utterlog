import { useEffect, useState, Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import { createRootRoute, createRoute, createRouter, RouterProvider, lazyRouteComponent } from '@tanstack/react-router';
import { useNavigate, Outlet, Navigate } from '@/lib/router';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Spinner } from '@/components/ui';
import { loadSiteOptions } from '@/lib/site';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * ChunkErrorBoundary — auto-reloads the page when a lazy-loaded chunk 404s.
 *
 * Happens when the server rebuilt during the user's session: their cached
 * index.html references chunk hashes that no longer exist on disk. The browser
 * throws "Failed to fetch dynamically imported module" / "ChunkLoadError".
 * We detect that once and do a hard reload to get fresh chunk names.
 *
 * Uses sessionStorage to avoid infinite reload loops.
 */
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(err: Error) {
    const isChunkError =
      err?.name === 'ChunkLoadError' ||
      /Loading chunk|dynamically imported module|Failed to fetch/i.test(err?.message || '');
    if (isChunkError) {
      const key = '__utterlog_chunk_reload';
      const last = Number(sessionStorage.getItem(key) || 0);
      const now = Date.now();
      if (now - last > 10_000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
      }
      return { failed: true };
    }
    throw err;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // non-chunk errors already re-thrown above; nothing to do here
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-dim)', fontSize: 14 }}>
          页面已更新，正在刷新…
        </div>
      );
    }
    return this.props.children;
  }
}

// Eager-loaded (used on almost every navigation)
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';

// Lazy-loaded (code-split per route, reduces initial bundle)
const DashboardHome = lazyRouteComponent(() => import('@/pages/DashboardHome'));
const PostsLayout = lazyRouteComponent(() => import('@/layouts/PostsLayout'));
const Posts = lazyRouteComponent(() => import('@/pages/Posts'));
const PostCreate = lazyRouteComponent(() => import('@/pages/PostCreate'));
const PostEdit = lazyRouteComponent(() => import('@/pages/PostEdit'));
const PostCategories = lazyRouteComponent(() => import('@/pages/PostCategories'));
const PostTags = lazyRouteComponent(() => import('@/pages/PostTags'));
const Pages = lazyRouteComponent(() => import('@/pages/Pages'));
const PageCreate = lazyRouteComponent(() => import('@/pages/PageCreate'));
const PageEdit = lazyRouteComponent(() => import('@/pages/PageEdit'));
const Films = lazyRouteComponent(() => import('@/pages/Films'));
const Moments = lazyRouteComponent(() => import('@/pages/Moments'));
const Footprints = lazyRouteComponent(() => import('@/pages/Footprints'));
const Comments = lazyRouteComponent(() => import('@/pages/Comments'));
const CommentsByStatus = lazyRouteComponent(() => import('@/pages/CommentsByStatus'));
const AICommentsQueue = lazyRouteComponent(() => import('@/pages/AICommentsQueue'));
const Annotations = lazyRouteComponent(() => import('@/pages/Annotations'));
const Follows = lazyRouteComponent(() => import('@/pages/Follows'));
const Links = lazyRouteComponent(() => import('@/pages/Links'));
const Media = lazyRouteComponent(() => import('@/pages/Media'));
const Albums = lazyRouteComponent(() => import('@/pages/Albums'));
const Music = lazyRouteComponent(() => import('@/pages/Music'));
const MusicPlaylists = lazyRouteComponent(() => import('@/pages/MusicPlaylists'));
const Playlists = lazyRouteComponent(() => import('@/pages/Playlists'));
const Movies = lazyRouteComponent(() => import('@/pages/Movies'));
const Videos = lazyRouteComponent(() => import('@/pages/Videos'));
const Books = lazyRouteComponent(() => import('@/pages/Books'));
const Games = lazyRouteComponent(() => import('@/pages/Games'));
const Goods = lazyRouteComponent(() => import('@/pages/Goods'));
const Analytics = lazyRouteComponent(() => import('@/pages/Analytics'));
const Security = lazyRouteComponent(() => import('@/pages/Security'));
const Themes = lazyRouteComponent(() => import('@/pages/Themes'));
const Plugins = lazyRouteComponent(() => import('@/pages/Plugins'));
const Tools = lazyRouteComponent(() => import('@/pages/Tools'));
const Settings = lazyRouteComponent(() => import('@/pages/Settings'));
const Profile = lazyRouteComponent(() => import('@/pages/Profile'));
const Backup = lazyRouteComponent(() => import('@/pages/Backup'));
const Assistant = lazyRouteComponent(() => import('@/pages/Assistant'));
const AiLogs = lazyRouteComponent(() => import('@/pages/AiLogs'));
const AiSettings = lazyRouteComponent(() => import('@/pages/AiSettings'));
const Utterlog = lazyRouteComponent(() => import('@/pages/Utterlog'));
const FormDemo = lazyRouteComponent(() => import('@/pages/FormDemo'));

/**
 * AuthGate — blocks protected routes until auth hydrates from localStorage.
 */
function AuthGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const runCheck = () => {
      const { accessToken, checkAuth } = useAuthStore.getState();
      if (!accessToken) {
        navigate('/login', { replace: true });
        return;
      }

      // Persisted auth is enough to render the shell immediately. API routes
      // still enforce the token, while verification and site options load in
      // parallel instead of adding two CDN round trips before the page mounts.
      setReady(true);
      void loadSiteOptions().catch(() => {});
      void checkAuth().then((valid) => {
        if (!valid) navigate('/login', { replace: true });
      });
    };
    if (useAuthStore.persist.hasHydrated()) {
      runCheck();
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(runCheck);
      return () => unsub();
    }
  }, [navigate]);

  if (!ready) {
    return <RouteLoading />;
  }
  return (
    <DashboardLayout>
      <ErrorBoundary>
        <ChunkErrorBoundary>
        {/* Suspense fallback：之前用 <RouteLoading />（全屏 overlay）会让
            每次路由切换都闪一下；改成透明占位 + 顶部细进度条 —— 侧栏 /
            头部保持可见，仅内容区轻微闪动，体感顺滑很多。 */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
        </ChunkErrorBoundary>
      </ErrorBoundary>
    </DashboardLayout>
  );
}

// 路由 chunk 加载中的占位：顶部 2px 蓝色不定进度条，主内容区透明。
// 切到 1.7MB 的 Analytics chunk 时尤其明显，原 overlay 闪一下太重。
function RouteFallback() {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 100 }}>
      <div
        aria-hidden
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 2,
          zIndex: 100, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent, var(--color-primary, #0052D9), transparent)',
          backgroundSize: '40% 100%',
          backgroundRepeat: 'no-repeat',
          animation: 'routeFallbackBar 1.2s linear infinite',
        }}
      />
    </div>
  );
}

// 路由切换 / 鉴权未就绪 / Suspense fallback 都走这个。
// 全 admin 唯一的"主 loading 视图"——固定全屏遮罩,viewport 中央,
// 不会跟着布局抖,见 ui/Spinner.tsx 注释。
function RouteLoading() {
  return <Spinner overlay />;
}

export default function App() {
  return <RouterProvider router={router} />;
}

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFound });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: Login });
const resetRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reset-password', component: ResetPassword });
const authRoute = createRoute({ getParentRoute: () => rootRoute, id: 'authenticated', component: AuthGate });

const protectedRoute = (path: string, component: React.ComponentType<any>) => createRoute({
  getParentRoute: () => authRoute,
  path: path as any,
  component: component as any,
}) as any;

const postsRoute: any = protectedRoute('/posts', PostsLayout);
const postsIndexRoute = createRoute({ getParentRoute: () => postsRoute, path: '/', component: Posts });
const postCategoriesRoute = createRoute({ getParentRoute: () => postsRoute, path: 'categories', component: PostCategories });
const postTagsRoute = createRoute({ getParentRoute: () => postsRoute, path: 'tags', component: PostTags });

const protectedRoutes: any[] = [
  protectedRoute('/', DashboardHome),
  postsRoute.addChildren([postsIndexRoute, postCategoriesRoute, postTagsRoute]),
  protectedRoute('/posts/create', PostCreate),
  protectedRoute('/posts/edit/$id', PostEdit),
  protectedRoute('/pages', Pages),
  protectedRoute('/menus', () => <Navigate to="/themes" replace />),
  protectedRoute('/pages/create', PageCreate),
  protectedRoute('/pages/edit/$id', PageEdit),
  protectedRoute('/films', Films),
  protectedRoute('/films/create', PostCreate),
  protectedRoute('/films/edit/$id', PostEdit),
  protectedRoute('/moments', Moments),
  protectedRoute('/footprints', Footprints),
  protectedRoute('/comments', Comments),
  protectedRoute('/comments/annotations', Annotations),
  protectedRoute('/comments/ai', AICommentsQueue),
  protectedRoute('/comments/$status', CommentsByStatus),
  protectedRoute('/follows', Follows),
  protectedRoute('/links', Links),
  protectedRoute('/media', Media),
  protectedRoute('/albums', Albums),
  protectedRoute('/music', Music),
  protectedRoute('/music/playlists', MusicPlaylists),
  protectedRoute('/playlists', Playlists),
  protectedRoute('/movies', Movies),
  protectedRoute('/videos', Videos),
  protectedRoute('/books', Books),
  protectedRoute('/games', Games),
  protectedRoute('/goods', Goods),
  protectedRoute('/analytics', Analytics),
  protectedRoute('/security', Security),
  protectedRoute('/themes', Themes),
  protectedRoute('/plugins', Plugins),
  protectedRoute('/tools', Tools),
  protectedRoute('/system/update', () => <Navigate to="/settings#update" replace />),
  protectedRoute('/backup', Backup),
  protectedRoute('/settings', Settings),
  protectedRoute('/profile', Profile),
  protectedRoute('/utterlog', Utterlog),
  protectedRoute('/form-demo', FormDemo),
  protectedRoute('/ai', Assistant),
  protectedRoute('/ai/logs', AiLogs),
  protectedRoute('/ai-settings', AiSettings),
];

const routeTree = rootRoute.addChildren([loginRoute, resetRoute, authRoute.addChildren(protectedRoutes as any)] as any);
const router = createRouter({ routeTree, basepath: '/admin', defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
