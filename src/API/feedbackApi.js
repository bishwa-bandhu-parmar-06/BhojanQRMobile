import api from './axiosInstance';

// The published testimonials shown on the app home screen. Public - no auth,
// and the server returns only rating, message, display name and date; the
// restaurant reference and order token stay on the admin side.
export const getPublishedFeedback = (limit = 10) => {
  return api.get('/platform-feedback/published', { params: { limit } });
};
