
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.113:8080/api';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to set basic auth header
export const setAuthCredentials = (login: string, password: string) => {
    const credentials = btoa(`${login}:${password}`);
    apiClient.defaults.headers.common['Authorization'] = `Basic ${credentials}`;
    localStorage.setItem('bepro_auth', credentials);
};

// Check for existing auth on load
const savedAuth = localStorage.getItem('bepro_auth');
if (savedAuth) {
    apiClient.defaults.headers.common['Authorization'] = `Basic ${savedAuth}`;
}

export default apiClient;
