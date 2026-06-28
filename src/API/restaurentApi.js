import api from './axiosInstance';

const BASE_URL = '/restaurants';

export const registerRestaurant = data => {
  return api.post(`${BASE_URL}/register`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const loginRestaurant = data => {
  return api.post(`${BASE_URL}/login`, data);
};

export const getRestaurantProfile = () => {
  return api.get(`${BASE_URL}/profile`);
};

// Mirrors the website's PendingApproval page polling - lighter than
// re-fetching the full profile, just the one field admin approval flips.
export const checkRestaurantStatus = () => {
  return api.get(`${BASE_URL}/check-status`);
};

// Verifies the HMAC `sig` a table's QR code was generated with, so a
// customer can't load a menu under a different table number than the one
// they actually scanned just by editing the URL/deep-link params.
export const validateTableNumber = (restaurantId, tableNumber, sig) => {
  return api.get(
    `${BASE_URL}/public/${restaurantId}/validate-table?table=${tableNumber}&sig=${sig || ''}`,
  );
};

export const updateRestaurantProfile = data => {
  return api.post(`${BASE_URL}/edit-profile`, data);
};

export const addRestaurantAddress = data => {
  return api.post(`${BASE_URL}/add-address`, data);
};

export const updateRestaurantAddress = (addressId, data) => {
  return api.post(`${BASE_URL}/update-address/${addressId}`, data);
};

export const deleteRestaurantAddress = addressId => {
  return api.post(`${BASE_URL}/delete-address/${addressId}`);
};

export const logoutRestaurant = () => {
  return api.post(`${BASE_URL}/logout`);
};

export const getDashboardStats = () => {
  return api.get(`${BASE_URL}/dashboard-stats`);
};

export const getSavedQRs = () => {
  return api.get(`${BASE_URL}/qr`);
};

export const generateAndSaveQRs = tableNumbers => {
  return api.post(`${BASE_URL}/qr/generate`, { tableNumbers });
};

export const deleteQR = id => {
  return api.post(`${BASE_URL}/qr/delete/${id}`);
};

// Fetch public restaurant details (Name and Email only)
export const getPublicRestaurantDetails = id => {
  return api.get(`${BASE_URL}/public/${id}`);
};

// Verifies a scanned table QR's HMAC signature before letting a guest order
export const validateTable = (id, table, sig) => {
  return api.get(`${BASE_URL}/public/${id}/validate-table`, {
    params: { table, sig },
  });
};

export const forgotPasswordRestaurant = email => {
  return api.post(`${BASE_URL}/forgot-password`, { email });
};

export const verifyResetTokenRestaurant = token => {
  return api.get(`${BASE_URL}/reset-password/${token}/verify`);
};

export const resetPasswordRestaurant = (token, password) => {
  return api.put(`${BASE_URL}/reset-password/${token}`, { password });
};

export const updateRestaurantEmail = (newEmail, currentPassword) => {
  return api.put(`${BASE_URL}/update-email`, { newEmail, currentPassword });
};

export const changeRestaurantPassword = (currentPassword, newPassword) => {
  return api.put(`${BASE_URL}/change-password`, { currentPassword, newPassword });
};

export const uploadRestaurantLogo = formData => {
  return api.post(`${BASE_URL}/upload-logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const addRestaurantDocument = formData => {
  return api.post(`${BASE_URL}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateRestaurantDocument = (docId, formData) => {
  return api.put(`${BASE_URL}/documents/${docId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteRestaurantDocument = docId => {
  return api.delete(`${BASE_URL}/documents/${docId}`);
};
