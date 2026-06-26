import api from './axiosInstance';

const BASE_URL = '/service';

export const requestWaiterService = data => {
  return api.post(`${BASE_URL}/call`, data);
};
