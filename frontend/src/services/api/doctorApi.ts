import { apiClient } from './axiosClient';

const BASE = '/api/v1/doctors';

export const doctorApi = {
  list(params?: {
    specialty?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    return apiClient.get(BASE, { params });
  },

  getById(id: string) {
    return apiClient.get(`${BASE}/${id}`);
  },

  getSlots(doctorId: string, date: string) {
    return apiClient.get(`${BASE}/${doctorId}/slots`, { params: { date } });
  },

  setWorkingHours(data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
  }) {
    return apiClient.put(`${BASE}/me/working-hours`, data);
  },

  requestLeave(data: { startDate: string; endDate: string; reason?: string }) {
    return apiClient.post(`${BASE}/me/leaves`, data);
  },

  approveLeave(leaveId: string) {
    return apiClient.post(`${BASE}/leaves/${leaveId}/approve`);
  },
};
