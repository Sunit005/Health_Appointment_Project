/**
 * Type-safe environment variable access.
 * All VITE_ prefixed vars are statically replaced at build time.
 */
export const env = {
  API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'Healthcare Manager',
  NODE_ENV: import.meta.env.MODE ?? 'development',
  IS_DEV: import.meta.env.DEV ?? true,
  IS_PROD: import.meta.env.PROD ?? false,
} as const;
