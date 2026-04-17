import axios from 'axios';
import { API_BASE_URL } from './config';

export const BASE_URL = API_BASE_URL;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor — attach JWT on every request ───────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bepro_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — ONE only, handles both logging and 401 ───────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('bepro_jwt');
      localStorage.removeItem('bepro_user');
      window.location.hash = '/login';
    }

    return Promise.reject(error);
  }
);

export const setAuthCredentials = (_login: string, _password: string) => {
  // No-op — interceptor handles token automatically
};

export default apiClient;