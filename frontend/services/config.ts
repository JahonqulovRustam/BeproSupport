const getBaseUrl = () => {
  let envUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    envUrl = envUrl.replace('localhost', window.location.hostname).replace('127.0.0.1', window.location.hostname);
  }
  if (envUrl) return envUrl;
  
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return 'http://localhost:8080';
};

export const API_BASE_URL = getBaseUrl();
export const AUTH_TOKEN_KEY = 'bepro_jwt';
export const USER_STORAGE_KEY = 'bepro_user';
export const MEDIA_STREAM_PATH = '/api/media/stream';
export const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/shapes/svg?seed=default';
