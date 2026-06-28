import api from './axiosInstance';

const BASE_URL = '/staff';

// PUBLIC
export const loginStaff = data => {
  return api.post(`${BASE_URL}/login`, data);
};

export const logoutStaff = () => {
  return api.post(`${BASE_URL}/logout`);
};

// OWNER-ONLY: staff management, used by the Staff Management tab on the
// restaurant owner's dashboard.
export const getStaffList = () => {
  return api.get(`${BASE_URL}`);
};

export const getStaffRoles = () => {
  return api.get(`${BASE_URL}/roles`);
};

export const createStaff = data => {
  return api.post(`${BASE_URL}`, data);
};

export const updateStaff = (id, data) => {
  return api.put(`${BASE_URL}/${id}`, data);
};

export const toggleStaffStatus = id => {
  return api.patch(`${BASE_URL}/${id}/status`);
};

export const deleteStaff = id => {
  return api.delete(`${BASE_URL}/${id}`);
};
