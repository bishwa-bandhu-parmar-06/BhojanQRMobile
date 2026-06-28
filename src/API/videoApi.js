import api from './axiosInstance';

const BASE_URL = '/videos';
const ADMIN_BASE_URL = '/admin/videos';

export const getPublicVideos = () => api.get(BASE_URL);

// Admin
export const getAdminVideos = () => api.get(ADMIN_BASE_URL);

export const createVideo = formData =>
  api.post(ADMIN_BASE_URL, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

export const updateVideo = (id, formData) =>
  api.put(`${ADMIN_BASE_URL}/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

export const deleteVideo = id => api.delete(`${ADMIN_BASE_URL}/${id}`);
