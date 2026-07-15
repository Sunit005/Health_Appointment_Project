import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/config/constants';
import type { UserRole } from '@healthcare/shared';

interface PublicRouteProps {
  children: React.ReactNode;
}

function roleRedirect(role: UserRole): string {
  if (role === 'ADMIN') return ROUTES.ADMIN_DASHBOARD;
  if (role === 'DOCTOR') return ROUTES.DOCTOR_DASHBOARD;
  return ROUTES.PATIENT_DASHBOARD;
}

/**
 * Wraps public-only pages (login, register).
 * Redirects authenticated users to their role-specific dashboard.
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isInitializing, user } = useAuthStore();

  if (isInitializing) return null;

  if (isAuthenticated && user) {
    return <Navigate to={roleRedirect(user.role)} replace />;
  }

  return <>{children}</>;
}
