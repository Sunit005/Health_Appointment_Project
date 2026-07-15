import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { storage } from '@/services/storage';
import toast from 'react-hot-toast';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function drainQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

export const apiClient = axios.create({
  baseURL: env.API_URL,
  withCredentials: true, // send refresh token cookie
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach access token ──────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 with silent token refresh ────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Network error
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Attempt silent refresh on 401 (skip for auth endpoints to avoid loops)
    if (
      status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise<string>((resolve) => {
          refreshQueue.push(resolve);
        }).then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        });
      }

      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{
          success: boolean;
          data: { accessToken: string };
        }>('/api/v1/auth/refresh');

        const newToken = data.data.accessToken;
        storage.setToken(newToken);
        drainQueue(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        // Refresh failed — clear local state and redirect to login
        storage.removeToken();
        refreshQueue = [];
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 — redirect to unauthorized page
    if (status === 403) {
      window.location.href = '/unauthorized';
    }

    // 500 — show generic server error toast
    if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  },
);
