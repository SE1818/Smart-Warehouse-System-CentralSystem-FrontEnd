import { create } from 'zustand';
import { authService } from '../services/auth';
import type { User, LoginRequest } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  role: null,
  isLoading: false,
  login: async (data: LoginRequest) => {
    set({ isLoading: true });
    try {
      const response = await authService.login(data);
      if (response && response.accessToken) {
        localStorage.setItem('authToken', response.accessToken);
        localStorage.setItem('authRole', response.role);
        
        // Fetch user profile
        const user = await authService.getProfile();
        localStorage.setItem('user', JSON.stringify(user));
        
        set({ user, token: response.accessToken, role: response.role, isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (e) {
      console.error('Login error in store:', e);
      set({ isLoading: false });
      return false;
    }
  },
  logout: async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authRole');
      localStorage.removeItem('user');
      set({ user: null, token: null, role: null });
    }
  },
  setUser: (user) => set({ user }),
  initialize: () => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('authRole');
    const userStr = localStorage.getItem('user');
    if (token && role && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, role });
      } catch (e) {
        console.error('Error restoring session:', e);
      }
    }
  },
}));
