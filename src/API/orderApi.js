import api from "./axiosInstance";

const BASE_URL = "/order";

export const createOrder = (data) => {
  return api.post(`${BASE_URL}/create-order`, data);
};

export const verifyPayment = (data) => {
  return api.post(`${BASE_URL}/verify-payment`, data);
};

export const getOrderByToken = (token) => {
  return api.get(`${BASE_URL}/status/${token}`);
};

export const getRestaurantOrders = () => {
  return api.get(`${BASE_URL}/hotel-orders`);
};

// Completed orders the live boards have released, newest-completed first.
// Paginated because history only ever grows - unlike /hotel-orders, which
// returns everything in one array because it is the live working set.
export const getOrderHistory = (page = 1, limit = 20) => {
  return api.get(`${BASE_URL}/history`, { params: { page, limit } });
};

export const updateOrderStatus = (id, data) => {
  return api.put(`${BASE_URL}/${id}/status`, data);
};

export const getActiveSessionsList = () => {
  return api.get(`${BASE_URL}/active-sessions`);
};

export const getTableMasterBill = (tableNumber) => {
  return api.get(`${BASE_URL}/table-bill/${tableNumber}`);
};

export const closeTableSession = (data) => {
  return api.post(`${BASE_URL}/close-session`, data);
};