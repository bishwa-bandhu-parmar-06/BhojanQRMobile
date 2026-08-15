import api from './axiosInstance';

const BASE_URL = '/support-tickets';

// RESTAURANT (owner or staff) - raise a query and track your own history.

// `data` must be a FormData: subject, description, and up to 3 files under
// the field name "attachments". Content-Type is deliberately not set - the
// runtime fills in the multipart boundary, and naming the type by hand omits
// it and the upload fails on the server.
export const createSupportTicket = data => {
  return api.post(BASE_URL, data);
};

export const getMyTickets = () => {
  return api.get(`${BASE_URL}/my-tickets`);
};

// ADMIN-ONLY. Not called from the restaurant dashboard; kept here so the
// module describes the whole endpoint rather than half of it.
export const getAllTickets = status => {
  return api.get(`${BASE_URL}/admin/all`, { params: status ? { status } : {} });
};

export const getOpenTicketCount = () => {
  return api.get(`${BASE_URL}/admin/open-count`);
};

// status: "open" | "in_progress" | "resolved"
export const updateTicketStatus = (id, status) => {
  return api.put(`${BASE_URL}/admin/${id}/status`, { status });
};
