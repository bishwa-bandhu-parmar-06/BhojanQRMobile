import api from './axiosInstance';

const BASE_URL = '/reports';

// The response body is a raw .xlsx file, not JSON - arraybuffer is the RN
// equivalent of the website's responseType: "blob".
//
// The instance's 15s default is tighter than the website's 30s, and this is
// the one call that legitimately needs longer: the server aggregates every
// order in the period and builds a 4-sheet workbook before the first byte is
// sent, so a yearly report (or a cold backend) can outrun 15s and surface as
// a timeout rather than a download.
export const downloadSalesReport = params => {
  return api.get(`${BASE_URL}/sales`, {
    params,
    responseType: 'arraybuffer',
    timeout: 60000,
  });
};

export const getRecapInsight = () => {
  return api.get(`${BASE_URL}/insights/recap`);
};

export const getBusinessInsights = () => {
  return api.get(`${BASE_URL}/insights/business`);
};
