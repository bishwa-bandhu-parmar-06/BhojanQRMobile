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

// `fresh` skips the server's cache and rewrites it from the database. The
// cache runs with sliding expiry, so a polling dashboard renews its own stale
// entry forever - without this a refresh is just another read, and reads are
// what keep the stale copy alive. Pass it from refresh buttons and
// pull-to-refresh, not from the background poll.
export const getRestaurantOrders = (fresh = false) => {
  return api.get(`${BASE_URL}/hotel-orders`, { params: fresh ? { fresh: 1 } : {} });
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

export const getActiveSessionsList = (fresh = false) => {
  return api.get(`${BASE_URL}/active-sessions`, { params: fresh ? { fresh: 1 } : {} });
};

export const getTableMasterBill = (tableNumber, fresh = false) => {
  return api.get(`${BASE_URL}/table-bill/${tableNumber}`, {
    params: fresh ? { fresh: 1 } : {},
  });
};

export const closeTableSession = (data) => {
  return api.post(`${BASE_URL}/close-session`, data);
};