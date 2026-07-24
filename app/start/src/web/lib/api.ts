import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from './store';

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const refreshResponse = await axios.post(
          `${'/api/v1'}/auth/refresh`,
          { refresh_token: refreshToken },
        );

        const { access_token, refresh_token } = refreshResponse.data.data;
        useAuthStore.getState().setTokens(access_token, refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  validate2FA: (tempToken: string, code: string) =>
    api.post('/auth/totp/validate', { temp_token: tempToken, code }),
  totpSetup: () => api.post('/auth/totp/setup'),
  totpVerify: (code: string) => api.post('/auth/totp/verify', { code }),
  totpDisable: (password: string, code: string) =>
    api.post('/auth/totp/disable', { password, code }),
  passkeyRegisterBegin: () => api.post('/auth/passkey/register/begin'),
  passkeyRegisterFinish: (data: any, sessionId: string) =>
    api.post('/auth/passkey/register/finish', data, { headers: { 'X-WebAuthn-Session': sessionId } }),
  passkeyLoginBegin: () => api.post('/auth/passkey/login/begin'),
  passkeyLoginFinish: (data: any, sessionId: string) =>
    api.post('/auth/passkey/login/finish', data, { headers: { 'X-WebAuthn-Session': sessionId } }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, new_password: newPassword }),
};

// Media API
export const mediaApi = {
  upload: (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    return api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadUrl: (url: string, folder?: string, name?: string) =>
    api.post('/media/download-url', { url, folder, name }),
  list: () => api.get('/media'),
  delete: (id: number) => api.delete(`/media/${id}`),
};

// Moments API
export const momentsApi = {
  list: (params?: any) => api.get('/moments', { params }),
  get: (id: number) => api.get(`/moments/${id}`),
  create: (data: any) => api.post('/moments', data),
  update: (id: number, data: any) => api.put(`/moments/${id}`, data),
  delete: (id: number) => api.delete(`/moments/${id}`),
  recentTags: (limit = 8) => api.get('/moments/recent-tags', { params: { limit } }),
};

export const geoApi = {
  reverse: (lat: number, lng: number) => api.get('/location/reverse', { params: { lat, lng } }),
};
export default api;
