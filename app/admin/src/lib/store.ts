import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from './api';

interface User {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  role: string;
  avatar?: string;
  url?: string;
  bio?: string;
}

function syncAuthCookie(token: string | null) {
  if (typeof document === 'undefined') return;
  if (!token) {
    document.cookie = 'utterlog_access_token=; Path=/; Max-Age=0; SameSite=Lax';
    return;
  }
  document.cookie = `utterlog_access_token=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax`;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pending2FA: string | null; // temp_token for 2FA validation

  login: (email: string, password: string) => Promise<void>;
  validate2FA: (code: string) => Promise<void>;
  cancel2FA: () => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      pending2FA: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response: any = await authApi.login(email, password);
          const data = response.data;

          // 2FA required
          if (data.require_2fa) {
            set({ isLoading: false, pending2FA: data.temp_token });
            return;
          }

          const { user, access_token, refresh_token } = data;
          syncAuthCookie(access_token);
          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
            pending2FA: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      validate2FA: async (code: string) => {
        const { pending2FA } = get();
        if (!pending2FA) throw new Error('No pending 2FA');
        set({ isLoading: true });
        try {
          const response: any = await authApi.validate2FA(pending2FA, code);
          const { user, access_token, refresh_token } = response.data;
          syncAuthCookie(access_token);
          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
            pending2FA: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      cancel2FA: () => {
        set({ pending2FA: null, isLoading: false });
      },

      logout: () => {
        authApi.logout().catch(() => {});
        syncAuthCookie(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setAccessToken: (token: string) => {
        syncAuthCookie(token);
        set({ accessToken: token });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        syncAuthCookie(accessToken);
        set({ accessToken, refreshToken });
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setAuth: (user: User, accessToken: string, refreshToken?: string) => {
        syncAuthCookie(accessToken);
        set({ user, accessToken, refreshToken: refreshToken ?? null, isAuthenticated: true });
      },

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) return false;

        try {
          const response: any = await authApi.me();
          set({ user: response.data, isAuthenticated: true });
          return true;
        } catch (err: any) {
          // 401 = token invalid, clear auth
          // Network error / other = backend unreachable, keep auth state
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            syncAuthCookie(null);
            set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
            return false;
          }
          // Backend unreachable — trust existing token
          return true;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Cross-tab sync: app/web and app/admin are served from the same origin and
// share this localStorage key. Without this listener, logging out on
// one tab leaves the other tab's in-memory Zustand state logged in
// until the user manually refreshes. `storage` only fires on OTHER
// tabs when the current tab writes localStorage, so there's no loop.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'auth-storage') return;
    try {
      const parsed = e.newValue ? JSON.parse(e.newValue)?.state : null;
      if (!parsed || !parsed.accessToken) {
        syncAuthCookie(null);
        useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      } else {
        syncAuthCookie(parsed.accessToken ?? null);
        useAuthStore.setState({
          user: parsed.user ?? null,
          accessToken: parsed.accessToken ?? null,
          refreshToken: parsed.refreshToken ?? null,
          isAuthenticated: !!parsed.isAuthenticated,
        });
      }
    } catch {
      syncAuthCookie(null);
      useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    }
  });
}

// Theme state and sidebar/music stores were removed (unused since Stage A cleanup).
