import { useCallback, useEffect, type AnchorHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import {
  Link as TanStackLink,
  Outlet,
  useNavigate as useTanStackNavigate,
  useParams as useTanStackParams,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';

type NavigateOptions = { replace?: boolean; state?: unknown };

function adminPath(pathname: string) {
  const path = pathname.replace(/^\/admin(?=\/|$)/, '') || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function useNavigate() {
  const navigate = useTanStackNavigate();
  const router = useRouter();
  return useCallback((to: string | number, options: NavigateOptions = {}) => {
    if (typeof to === 'number') {
      router.history.go(to);
      return;
    }
    return navigate({ to: to as never, replace: options.replace, state: options.state as never });
  }, [navigate, router]);
}

export function useLocation() {
  return useRouterState({ select: ({ location }) => ({
    pathname: adminPath(location.pathname),
    search: location.searchStr,
    hash: location.hash,
    state: location.state,
    key: location.state?.key || '',
  }) });
}

export function useSearchParams() {
  const location = useRouterState({ select: (state) => state.location });
  return [new URLSearchParams(location.searchStr)] as const;
}

export function useParams<T extends Record<string, string | undefined>>() {
  return useTanStackParams({ strict: false } as any) as T;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { children?: ReactNode; to: string };

export function Link(props: LinkProps) {
  return <TanStackLink {...props as any} />;
}

type NavState = { isActive: boolean; isPending: boolean; isTransitioning: boolean };
type NavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href' | 'style'> & {
  children?: ReactNode | ((state: NavState) => ReactNode);
  end?: boolean;
  style?: CSSProperties | ((state: NavState) => CSSProperties);
  to: string;
};

export function NavLink({ children, end, style, to, ...props }: NavLinkProps) {
  const pathname = useLocation().pathname;
  const target = to.split(/[?#]/)[0] || '/';
  const isActive = end || target === '/'
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target}/`);
  const state = { isActive, isPending: false, isTransitioning: false };
  return (
    <TanStackLink to={to as never} style={typeof style === 'function' ? style(state) : style} {...props as any}>
      {typeof children === 'function' ? children(state) : children}
    </TanStackLink>
  );
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => { void navigate(to, { replace }); }, [navigate, replace, to]);
  return null;
}

export { Outlet };
