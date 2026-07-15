import { apiClient } from './axiosClient';

const BASE = '/api/v1/admin';

export const adminApi = {
  getMetrics() {
    return apiClient.get(`${BASE}/metrics`);
  },

  getAuditLogs(params?: { page?: number; limit?: number }) {
    return apiClient.get(`${BASE}/audit-logs`, { params });
  },

  getUsers(params?: { page?: number; limit?: number }) {
    return apiClient.get(`${BASE}/users`, { params });
  },

  disableUser(id: string) {
    return apiClient.post(`${BASE}/users/${id}/disable`);
  },

  getPendingLeaves() {
    return apiClient.get(`${BASE}/leaves`);
  },

  approveLeave(leaveId: string) {
    return apiClient.post(`/api/v1/doctors/leaves/${leaveId}/approve`);
  },

  listDoctors() {
    return apiClient.get(`${BASE}/doctors`);
  },

  createDoctor(data: any) {
    return apiClient.post(`${BASE}/doctors`, data);
  },

  updateDoctor(id: string, data: any) {
    return apiClient.put(`${BASE}/doctors/${id}`, data);
  },

  getDoctorWorkingHours(id: string) {
    return apiClient.get(`${BASE}/doctors/${id}/working-hours`);
  },

  updateDoctorWorkingHours(id: string, workingHours: any[]) {
    return apiClient.put(`${BASE}/doctors/${id}/working-hours`, { workingHours });
  },

  getDoctorLeaves(id: string) {
    return apiClient.get(`${BASE}/doctors/${id}/leaves`);
  },

  createDoctorLeave(id: string, data: any) {
    return apiClient.post(`${BASE}/doctors/${id}/leaves`, data);
  },
};
