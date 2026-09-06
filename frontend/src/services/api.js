import axios from 'axios';

// Resolve API base URL dynamically for production (Vercel -> Render) deployment
export const SERVER_ROOT_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '';

export const API_BASE_URL = SERVER_ROOT_URL ? `${SERVER_ROOT_URL}/api` : '/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
API.interceptors.request.use((config) => {
  // If Authorization is already explicitly provided, respect it
  if (config.headers?.Authorization) {
    return config;
  }

  const isClientContext =
    window.location.pathname.startsWith('/portal') ||
    config.url?.includes('/clients/portal') ||
    config.url?.includes('/notes/client-view') ||
    config.url?.includes('/communication/client-messages');

  const token = isClientContext
    ? (localStorage.getItem('unfazed_client_token') || localStorage.getItem('unfazed_token'))
    : (localStorage.getItem('unfazed_token') || localStorage.getItem('unfazed_client_token'));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      if (window.location.pathname.startsWith('/portal')) {
        localStorage.removeItem('unfazed_client_token');
      } else {
        localStorage.removeItem('unfazed_token');
        localStorage.removeItem('unfazed_user');
      }
    }
    return Promise.reject(error);
  }
);

export default API;
