import api from './axiosInstance';

const BASE_URL = '/service';

export const requestWaiterService = data => {
  return api.post(`${BASE_URL}/call`, data);
};

// Owner/staff answering a table's call. `status` is "Acknowledged" (someone
// is coming) or "Resolved" (dealt with).
export const respondToWaiterCall = (id, data) => {
  return api.put(`${BASE_URL}/respond/${id}`, data);
};
