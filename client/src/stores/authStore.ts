import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/axios';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  status?: 'PENDING' | 'APPROVED';
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: (callApi?: boolean) => Promise<void>;
  setAccessToken: (token: string) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (data) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', data);
          set({ 
            user: res.data.data.user, 
            accessToken: res.data.data.accessToken 
          });
          toast.success('Logged in successfully');
        } catch (error: any) {
          toast.error(error.response?.data?.error?.message || 'Login failed');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (data) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/signup', data);
        } catch (error: any) {
          toast.error(error.response?.data?.error?.message || 'Signup failed');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async (callApi = true) => {
        if (callApi) {
          try {
            await api.post('/auth/logout');
          } catch (error) {
            console.error('Logout API failed', error);
          }
        }
        set({ user: null, accessToken: null });
      },

      setAccessToken: (token: string) => set({ accessToken: token }),

      fetchProfile: async () => {
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.data });
        } catch (error) {
          // Silently handled by interceptor
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
);
