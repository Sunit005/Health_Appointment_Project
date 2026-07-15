export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  UNAUTHORIZED: '/unauthorized',
  // Role dashboards
  PATIENT_DASHBOARD: '/patient/dashboard',
  DOCTOR_DASHBOARD: '/doctor/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
} as const;

export const QUERY_KEYS = {
  AUTH_USER: ['auth', 'user'],
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'hc_access_token',
  THEME: 'hc_theme',
} as const;

export const ACCESS_TOKEN_COOKIE = 'refreshToken';
