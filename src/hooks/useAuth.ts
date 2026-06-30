import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

// Simple auth hook with localStorage token management
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        try {
          const parsed = JSON.parse(userData);
          if (!parsed.id) {
            try {
              const tokenParts = token.split('.');
              if (tokenParts.length > 1) {
                const payload = JSON.parse(atob(tokenParts[1]));
                parsed.id = payload.sub || payload.nameid || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || '';
                localStorage.setItem('user', JSON.stringify(parsed));
              }
            } catch (e) {
              console.error('Error auto-decoding token in useAuth:', e);
            }
          }
          setUser(parsed);
        } catch {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, loading, login, logout };
}
