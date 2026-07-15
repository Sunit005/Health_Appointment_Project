import { STORAGE_KEYS } from '@/config/constants';

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  },
  removeToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
  getTheme(): 'dark' | 'light' | null {
    return localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light' | null;
  },
  setTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },
};
