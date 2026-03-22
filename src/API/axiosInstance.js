import axios from 'axios';
import { Platform } from 'react-native';
import { store } from '../App/store';
import { logout } from '../Features/AuthSlice';

// DEFINE YOUR ENVIRONMENTS HERE
const LOCAL_IP = '192.168.1.10';
const ENV = {
  PROD_URL: 'https://bhojanqr-mjos.onrender.com/api',
  DEV_ANDROID_URL: `http://${LOCAL_IP}:3000/api`,
  DEV_IOS_URL: `http://${LOCAL_IP}:3000/api`,
};

// SMART URL SELECTOR
const getBaseUrl = () => {
  if (__DEV__) {
    console.log('Running in DEVELOPMENT mode');
    return Platform.OS === 'android' ? ENV.DEV_ANDROID_URL : ENV.DEV_IOS_URL;
  }

  console.log('Running in PRODUCTION mode');
  return ENV.PROD_URL;
};

// CREATE AXIOS INSTANCE
const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// 4. INTERCEPTORS
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        console.log('Session expired or unauthorized. Dispatching logout...');
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
