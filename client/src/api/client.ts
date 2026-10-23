import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const patronToken = localStorage.getItem('lms_patron_token');
  const isPatronEndpoint =
    config.url?.startsWith('/patron') ||
    config.url?.startsWith('patron') ||
    config.url === '/seats' ||
    config.url?.startsWith('/seats');
  const isPortalContext = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');

  if ((isPatronEndpoint || isPortalContext) && patronToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${patronToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Graceful handling of common errors
    if (error.response?.status === 503 && error.response?.data?.code === 'P1001') {
      console.warn('Database connection unavailable.');
    }
    return Promise.reject(error);
  }
);
