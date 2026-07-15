import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api/authApi';
import { ROUTES } from '@/config/constants';
import type { LoginInput, RegisterInput } from '@healthcare/shared';
import type { AuthUser } from '@/types/auth.types';
import type { UserRole } from '@healthcare/shared';
import { getErrorMessage } from '@/utils/formatters';

function roleRedirect(role: UserRole): string {
  if (role === 'ADMIN') return ROUTES.ADMIN_DASHBOARD;
  if (role === 'DOCTOR') return ROUTES.DOCTOR_DASHBOARD;
  return ROUTES.PATIENT_DASHBOARD;
}

export function useAuth() {
  const { user, isAuthenticated, isInitializing, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // ── Login ────────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (data: Pick<LoginInput, 'email' | 'password'>) => authApi.login(data),
    onSuccess: ({ data }) => {
      const { accessToken, user: userInfo } = data.data;
      const authUser: AuthUser = { id: userInfo.id, email: '', role: userInfo.role };
      setAuth(accessToken, authUser);
      toast.success('Welcome back!');
      navigate(roleRedirect(userInfo.role));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ── Register ─────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: () => {
      toast.success('Account created! Please check your email to verify.');
      navigate(ROUTES.LOGIN);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors — clear local state regardless
    }
    clearAuth();
    navigate(ROUTES.LOGIN);
    toast.success('Logged out successfully.');
  }, [clearAuth, navigate]);

  // ── Forgot password ───────────────────────────────────────────────────────
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword({ email }),
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ── Reset password ────────────────────────────────────────────────────────
  const resetPasswordMutation = useMutation({
    mutationFn: (data: { token: string; password: string; confirmPassword: string }) =>
      authApi.resetPassword(data),
    onSuccess: () => {
      toast.success('Password reset successfully!');
      navigate(ROUTES.LOGIN);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return {
    user,
    isAuthenticated,
    isInitializing,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout,
    forgotPassword: forgotPasswordMutation.mutate,
    forgotPasswordAsync: forgotPasswordMutation.mutateAsync,
    isSendingReset: forgotPasswordMutation.isPending,
    forgotPasswordSuccess: forgotPasswordMutation.isSuccess,
    resetPassword: resetPasswordMutation.mutate,
    resetPasswordAsync: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
  };
}
