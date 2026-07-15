import { apiClient } from './axiosClient';
import type { RegisterInput, LoginInput, ForgotPasswordInput } from '@healthcare/shared';
import type { LoginResponseData, RegisterResponseData } from '@healthcare/shared';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { AuthUser } from '@/types/auth.types';

const BASE = '/api/v1/auth';

export const authApi = {
  register(data: RegisterInput) {
    return apiClient.post<ApiSuccessResponse<RegisterResponseData>>(`${BASE}/register`, data);
  },

  login(data: Pick<LoginInput, 'email' | 'password'>) {
    return apiClient.post<ApiSuccessResponse<LoginResponseData>>(`${BASE}/login`, data);
  },

  logout() {
    return apiClient.post<ApiSuccessResponse<null>>(`${BASE}/logout`);
  },

  refresh() {
    return apiClient.post<ApiSuccessResponse<{ accessToken: string }>>(`${BASE}/refresh`);
  },

  forgotPassword(data: ForgotPasswordInput) {
    return apiClient.post<ApiSuccessResponse<null>>(`${BASE}/forgot-password`, data);
  },

  resetPassword(data: { token: string; password: string; confirmPassword: string }) {
    return apiClient.post<ApiSuccessResponse<null>>(`${BASE}/reset-password`, data);
  },

  verifyEmail(token: string) {
    return apiClient.post<ApiSuccessResponse<null>>(`${BASE}/verify-email`, { token });
  },

  getProfile() {
    return apiClient.get<ApiSuccessResponse<{ id: string; email: string; role: string; patientProfile?: unknown }>>('/api/v1/users/profile');
  },

  /** Build a full AuthUser from a login response */
  toAuthUser(data: LoginResponseData): AuthUser {
    return { id: data.user.id, email: '', role: data.user.role };
  },
};
