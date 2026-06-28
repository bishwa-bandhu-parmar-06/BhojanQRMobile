import api from './axiosInstance';

const BASE_URL = '/customers';

export const registerCustomer = data => {
  return api.post(`${BASE_URL}/register`, data);
};

export const loginCustomer = data => {
  return api.post(`${BASE_URL}/login`, data);
};

export const getCustomerProfile = () => {
  return api.get(`${BASE_URL}/profile`);
};

export const updateCustomerProfile = data => {
  return api.put(`${BASE_URL}/profile`, data);
};

export const getCustomerDashboardSummary = () => {
  return api.get(`${BASE_URL}/dashboard-summary`);
};

export const getCustomerBills = params => {
  return api.get(`${BASE_URL}/bills`, { params });
};

export const getExpenditureAnalytics = () => {
  return api.get(`${BASE_URL}/expenditure`);
};

export const logoutCustomer = () => {
  return api.post(`${BASE_URL}/logout`);
};

export const forgotPasswordCustomer = email => {
  return api.post(`${BASE_URL}/forgot-password`, { email });
};

export const resetPasswordCustomer = (token, password) => {
  return api.put(`${BASE_URL}/reset-password/${token}`, { password });
};

export const googleAuthCustomer = credential => {
  return api.post(`${BASE_URL}/google`, { credential });
};
