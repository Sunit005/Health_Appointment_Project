import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/config/constants';
import { PublicRoute } from './PublicRoute';
import { RoleBasedRoute } from './RoleBasedRoute';
import { useAuthStore } from '@/store/authStore';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// Error pages
import UnauthorizedPage from '@/pages/error/UnauthorizedPage';
import NotFoundPage from '@/pages/error/NotFoundPage';

// Role dashboards
import PatientDashboardPage from '@/pages/patient/PatientDashboardPage';
import DoctorDashboardPage from '@/pages/doctor/DoctorDashboardPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';

function DashboardRedirect() {
  const { isAuthenticated, user, isInitializing } = useAuthStore();

  if (isInitializing) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    case 'DOCTOR':
      return <Navigate to={ROUTES.DOCTOR_DASHBOARD} replace />;
    case 'PATIENT':
    default:
      return <Navigate to={ROUTES.PATIENT_DASHBOARD} replace />;
  }
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path={ROUTES.HOME} element={<DashboardRedirect />} />

      {/* Public-only routes */}
      <Route path={ROUTES.LOGIN} element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path={ROUTES.REGISTER} element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />

      {/* Patient portal */}
      <Route
        path={`${ROUTES.PATIENT_DASHBOARD}/*`}
        element={
          <RoleBasedRoute allowedRoles={['PATIENT']}>
            <PatientDashboardPage />
          </RoleBasedRoute>
        }
      />

      {/* Doctor portal */}
      <Route
        path={`${ROUTES.DOCTOR_DASHBOARD}/*`}
        element={
          <RoleBasedRoute allowedRoles={['DOCTOR']}>
            <DoctorDashboardPage />
          </RoleBasedRoute>
        }
      />

      {/* Admin portal */}
      <Route
        path={`${ROUTES.ADMIN_DASHBOARD}/*`}
        element={
          <RoleBasedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </RoleBasedRoute>
        }
      />

      {/* Catch-all redirect for authenticated users to their dashboard */}
      <Route
        path="/dashboard"
        element={<DashboardRedirect />}
      />

      {/* Error pages */}
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
