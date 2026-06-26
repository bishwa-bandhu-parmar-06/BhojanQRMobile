import axios from 'axios';
import { store } from '../App/store';
import { logout } from '../Features/AuthSlice';
import { getToken, clearToken } from '../utils/tokenStorage';
import { API_BASE_URL } from '../config/env';

// CREATE AXIOS INSTANCE
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach the Bearer token from secure storage. RN's cookie handling is
// unreliable across app restarts, but the backend's authMiddleware already
// accepts "Authorization: Bearer <token>" ahead of cookies, so this is all
// that's needed.
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 4. INTERCEPTORS
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        console.log('Session expired or unauthorized. Dispatching logout...');
        clearToken();
        store.dispatch(logout());
      }

      if (status === 403) {
        console.log('Access forbidden');
      }
    } else if (error.request) {
      console.log('Network error. Check your internet connection.');
    }

    return Promise.reject(error);
  },
);

export default api;
