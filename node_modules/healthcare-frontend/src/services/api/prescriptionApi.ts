import { apiClient } from './axiosClient';

const BASE = '/api/v1/prescriptions';

export const prescriptionApi = {
  getMyPrescriptions() {
    return apiClient.get(`${BASE}/my`);
  },

  getReminders() {
    return apiClient.get(`${BASE}/reminders`);
  },

  completeReminderLog(logId: string) {
    return apiClient.post(`${BASE}/reminders/logs/${logId}/complete`);
  },
};
