import { create } from 'zustand';
import type { AuthUser } from '@/types/auth.types';
import { storage } from '@/services/storage';

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setInitializing: (value: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: storage.getToken(),
  isAuthenticated: !!storage.getToken(),
  isInitializing: true,

  setAuth(token, user) {
    storage.setToken(token);
    set({ accessToken: token, user, isAuthenticated: true });
  },

  clearAuth() {
    storage.removeToken();
    set({ accessToken: null, user: null, isAuthenticated: false });
  },

  setInitializing(value) {
    set({ isInitializing: value });
  },
}));
