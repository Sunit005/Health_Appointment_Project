import { apiClient } from './axiosClient';

const BASE = '/api/v1/notifications';

export const notificationApi = {
  list() {
    return apiClient.get(BASE);
  },

  markRead(id: string) {
    return apiClient.post(`${BASE}/${id}/read`);
  },
};
