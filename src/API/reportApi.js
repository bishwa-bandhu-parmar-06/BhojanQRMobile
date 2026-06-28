import api from './axiosInstance';

const BASE_URL = '/reports';

// The response body is a raw .xlsx file, not JSON - arraybuffer is the RN
// equivalent of the website's responseType: "blob".
export const downloadSalesReport = params => {
  return api.get(`${BASE_URL}/sales`, { params, responseType: 'arraybuffer' });
};

export const getRecapInsight = () => {
  return api.get(`${BASE_URL}/insights/recap`);
};

export const getBusinessInsights = () => {
  return api.get(`${BASE_URL}/insights/business`);
};
