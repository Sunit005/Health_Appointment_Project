import { apiClient } from './axiosClient';

const BASE = '/api/v1/ai';

export const aiApi = {
  triage(symptomText: string) {
    return apiClient.post(`${BASE}/triage`, { symptomText });
  },

  generatePreVisit(appointmentId: string) {
    return apiClient.post(`${BASE}/pre-visit/${appointmentId}`);
  },

  generatePostVisit(appointmentId: string) {
    return apiClient.post(`${BASE}/post-visit/${appointmentId}`);
  },
};
