import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // For httpOnly cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token using httpOnly cookie
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newAccessToken = res.data.data.accessToken;
        
        // Update the store
        useAuthStore.getState().setAccessToken(newAccessToken);
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Refresh failed — user is not logged in, log out silently without showing any toast
        useAuthStore.getState().logout(false);
        refreshError._isAuthError = true; // Mark so callers can silently skip toasts
        return Promise.reject(refreshError);
      }
    }
    
    // If this was a silent auth failure, don't propagate to callers with toasts
    if (error._isAuthError || error.response?.status === 401) {
      error._isAuthError = true;
    }

    return Promise.reject(error);
  }
);
