import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/types/auth';
import { authService } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    localStorage.setItem('authToken', response.accessToken);
    await refreshUser();
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await authService.register({ username, email, password });
    localStorage.setItem('authToken', response.accessToken);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
