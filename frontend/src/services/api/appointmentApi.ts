import { apiClient } from './axiosClient';

const BASE = '/api/v1/appointments';

export const appointmentApi = {
  book(data: { doctorId: string; scheduledStart: string; symptomDescription?: string }) {
    return apiClient.post(BASE, data);
  },

  hold(data: { doctorId: string; scheduledStart: string }) {
    return apiClient.post(`${BASE}/hold`, data);
  },

  confirm(id: string, data: { symptomDescription?: string }) {
    return apiClient.post(`${BASE}/${id}/confirm`, data);
  },

  getById(id: string) {
    return apiClient.get(`${BASE}/${id}`);
  },

  cancel(id: string, reason?: string) {
    return apiClient.post(`${BASE}/${id}/cancel`, { reason });
  },

  reschedule(id: string, scheduledStart: string) {
    return apiClient.put(`${BASE}/${id}/reschedule`, { scheduledStart });
  },

  myHistory(params?: { page?: number; limit?: number }) {
    return apiClient.get(`${BASE}/my`, { params });
  },

  doctorSchedule(date?: string) {
    return apiClient.get(`${BASE}/doctor-schedule`, { params: date ? { date } : undefined });
  },
};
