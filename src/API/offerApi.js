import api from './axiosInstance';

const BASE_URL = '/offers';

export const getMyOffers = () => {
  return api.get(`${BASE_URL}/my-offers`);
};

export const getOffer = id => {
  return api.get(`${BASE_URL}/${id}`);
};

export const createOffer = data => {
  return api.post(`${BASE_URL}`, data);
};

export const updateOffer = (id, data) => {
  return api.put(`${BASE_URL}/${id}`, data);
};

export const updateOfferStatus = (id, status) => {
  return api.patch(`${BASE_URL}/${id}/status`, { status });
};

export const deleteOffer = id => {
  return api.delete(`${BASE_URL}/${id}`);
};

export const getOfferAnalytics = id => {
  return api.get(`${BASE_URL}/${id}/analytics`);
};
