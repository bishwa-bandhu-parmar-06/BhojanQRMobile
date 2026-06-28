import api from './axiosInstance';

const BASE_URL = '/newsletter';

export const subscribeNewsletter = (email, source) =>
  api.post(`${BASE_URL}/subscribe`, { email, source });

// Admin
export const getSubscribers = (page = 1, limit = 20) =>
  api.get(`${BASE_URL}/admin/subscribers?page=${page}&limit=${limit}`);

export const createNewsletter = (subject, content) =>
  api.post(`${BASE_URL}/admin/newsletters`, { subject, content });

export const generateNewsletterContent = subject =>
  api.post(`${BASE_URL}/admin/newsletters/generate-content`, { subject });

export const getNewsletters = () => api.get(`${BASE_URL}/admin/newsletters`);

export const getNewsletterById = id =>
  api.get(`${BASE_URL}/admin/newsletters/${id}`);

export const deleteNewsletter = id =>
  api.delete(`${BASE_URL}/admin/newsletters/${id}`);

export const sendNewsletter = id =>
  api.post(`${BASE_URL}/admin/newsletters/${id}/send`);
