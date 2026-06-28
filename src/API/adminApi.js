import api from "./axiosInstance";

const BASE_URL = "/admin";

export const registerAdmin = (data) => {
  return api.post(`${BASE_URL}/register`, data);
};

export const loginAdmin = (data) => {
  return api.post(`${BASE_URL}/login`, data);
};

export const updateAdminProfile = (data) => {
  return api.post(`${BASE_URL}/edit-profile`, data);
};

export const getAdminProfile = () => {
  return api.get(`${BASE_URL}/profile`);
};

export const logoutAdmin = () => {
  return api.post(`${BASE_URL}/logout`);
};

// Get all restaurants with 'pending' status
export const getPendingRestaurants = () => {
  return api.get(`${BASE_URL}/restaurants/pending`);
};

// Get all restaurants with 'approved' status

export const getApprovedRestaurants = () => {
  return api.get(`${BASE_URL}/restaurants/approved`);
};

// Get all restaurants with 'rejected' status
export const getRejectedRestaurants = () => {
  return api.get(`${BASE_URL}/restaurants/rejected`);
};

// Approve a restaurant by ID
export const approveRestaurant = (id) => {
  const response = api.post(`${BASE_URL}/restaurants/${id}/approve`);
  return response;
};

// Reject a restaurant by ID
export const rejectRestaurant = (id) => {
  return api.post(`${BASE_URL}/restaurants/${id}/reject`);
};

// Full analytics for one restaurant (menu count, orders, revenue, join date)
export const getRestaurantDetailsAdmin = (id) => {
  return api.get(`${BASE_URL}/restaurants/${id}/details`);
};

// Moves a restaurant between pending/approved/rejected - unlike
// approveRestaurant/rejectRestaurant (which only ever move a pending
// restaurant forward), this can also move it back, e.g. un-approve.
export const updateRestaurantStatusAdmin = (id, status) => {
  return api.post(`${BASE_URL}/restaurants/${id}/status`, { status });
};

// Fetch the public admin contact email for support pages
export const getPublicAdminContact = () => {
  return api.get(`${BASE_URL}/public/contact`);
};

export const forgotPasswordAdmin = (email) => {
  return api.post(`${BASE_URL}/forgot-password`, { email });
};

export const resetPasswordAdmin = (token, password) => {
  return api.put(`${BASE_URL}/reset-password/${token}`, { password });
};
