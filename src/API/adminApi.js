import api from "./axiosInstance";

const BASE_URL = "/admin";

// Intentionally NOT bound here any more. POST /admin/register is guarded by
// requireSuperAdminSecret (server/routes/adminRoutes.js) - a header only the
// platform operator holds - so this app can never call it successfully.
// Keeping a function for it invited exactly the sign-up form that has just
// been removed. New admins are invited by an existing one.

export const loginAdmin = (data) => {
  return api.post(`${BASE_URL}/login`, data);
};

export const updateAdminProfile = (data) => {
  return api.post(`${BASE_URL}/edit-profile`, data);
};

// Platform-wide totals for the admin Home tab: restaurant counts by status,
// revenue windows, orders, subscribers, open tickets, a 14-day revenue trend,
// top restaurants and recent signups.
export const getAdminOverview = () => {
  return api.get(`${BASE_URL}/overview`);
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
// --- Admin team ------------------------------------------------------------
// New admins are created by invitation from an existing one; there is no
// self-service sign-up (POST /admin/register is secret-guarded).
export const getAllAdmins = () => {
  return api.get(`${BASE_URL}/admins`);
};

export const inviteAdmin = (data) => {
  return api.post(`${BASE_URL}/admins/invite`, data);
};

export const resendAdminInvite = (id) => {
  return api.post(`${BASE_URL}/admins/${id}/resend-invite`);
};

// Cancels a pending invitation, or removes an activated sub-admin. The server
// blocks removing your own account and the last active admin, so the panel
// can never be locked out entirely.
export const deleteAdmin = (id) => {
  return api.delete(`${BASE_URL}/admins/${id}`);
};

export const getPublicAdminContact = () => {
  return api.get(`${BASE_URL}/public/contact`);
};

export const forgotPasswordAdmin = (email) => {
  return api.post(`${BASE_URL}/forgot-password`, { email });
};

export const resetPasswordAdmin = (token, password) => {
  return api.put(`${BASE_URL}/reset-password/${token}`, { password });
};

// --- Platform feedback -----------------------------------------------------
// Responses customers leave about the BhojanQR experience itself. Admin-only
// except getPublishedFeedback, which is what the public testimonial strips read.
export const getAllFeedback = (published) => {
  return api.get('/platform-feedback', {
    params: published === undefined ? {} : { published },
  });
};

export const setFeedbackPublished = (id, isPublished) => {
  return api.patch(`/platform-feedback/${id}/publish`, { isPublished });
};

// --- Contact messages ------------------------------------------------------
export const getContactMessages = (status) => {
  return api.get('/contact', { params: status ? { status } : {} });
};

export const updateContactStatus = (id, status) => {
  return api.patch(`/contact/${id}/status`, { status });
};
