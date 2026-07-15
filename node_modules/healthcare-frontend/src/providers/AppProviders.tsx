import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api/authApi';
import { storage } from '@/services/storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/** Restores the user session on app load by verifying the stored access token. */
function SessionRestorer() {
  const { setAuth, clearAuth, setInitializing } = useAuthStore();

  useEffect(() => {
    const token = storage.getToken();
    if (!token) {
      setInitializing(false);
      return;
    }

    authApi
      .getProfile()
      .then(({ data }) => {
        const profile = data.data;
        setAuth(token, {
          id: profile.id,
          email: profile.email,
          role: profile.role as 'PATIENT' | 'DOCTOR' | 'ADMIN',
        });
      })
      .catch(() => {
        // Token is invalid or expired — try silent refresh
        authApi
          .refresh()
          .then(({ data }) => {
            const newToken = data.data.accessToken;
            return authApi.getProfile().then(({ data: profileData }) => {
              setAuth(newToken, {
                id: profileData.data.id,
                email: profileData.data.email,
                role: profileData.data.role as 'PATIENT' | 'DOCTOR' | 'ADMIN',
              });
            });
          })
          .catch(() => {
            clearAuth();
          })
          .finally(() => {
            setInitializing(false);
          });
        return;
      })
      .finally(() => {
        setInitializing(false);
      });
  }, []);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <SessionRestorer />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-overlay)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                fontSize: '14px',
                backdropFilter: 'blur(12px)',
              },
            }}
          />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
