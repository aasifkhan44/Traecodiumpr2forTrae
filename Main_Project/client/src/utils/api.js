import axios from 'axios';

// Ensure API_BASE_URL always ends with /api
const getBaseUrl = () => {
  let base;
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL_DEV) {
      base = import.meta.env.VITE_API_BASE_URL_DEV;
    } else if (import.meta.env.VITE_API_BASE_URL) {
      base = import.meta.env.VITE_API_BASE_URL;
    }
  }
  base = base || 'http://localhost:5000/api';
  if (!base.endsWith('/api')) {
    base = base.replace(/\/+$/, '') + '/api';
  }
  return base;
};

export const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;