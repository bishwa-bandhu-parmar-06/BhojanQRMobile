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

// The grouped permission catalogue. Served rather than bundled so a right
// added on the server can be granted without shipping a new app build; the
// constants file is only the fallback until this lands.
// The signed-in staff member's CURRENT permissions, straight from the
// server. Login bakes them into the session, so without re-reading them a
// revoked right stays granted on that device until the next sign-in.
export const getMyAccess = () => {
  return api.get(`${BASE_URL}/me`);
};

export const getPermissionCatalogue = () => {
  return api.get(`${BASE_URL}/permissions`);
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
