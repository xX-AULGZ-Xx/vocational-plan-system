'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  email?: string | null;
  full_name: string;
  position: string;
  avatar_url?: string | null;
  signature_img?: string | null;
  google_id?: string | null;
  is_profile_completed?: boolean;
  role: 'TEACHER' | 'HEAD_DEPT' | 'DEPUTY_DIRECTOR' | 'PLANNING_OFFICER' | 'DIRECTOR' | 'ADMIN';
  department?: {
    id: number;
    name: string;
    division_id: number;
    division?: {
      id: number;
      name: string;
      code: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  updateUser: (user: User, token?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  updateUser: () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('vps_token');
    const savedUser = localStorage.getItem('vps_user');
    if (savedToken) {
      // If token is abnormally large (e.g. > 4000 characters from legacy base64 image in payload), purge or ignore
      if (savedToken.length > 4000) {
        console.warn('Detected legacy oversized token, resetting session to prevent 431 header error');
        localStorage.removeItem('vps_token');
        localStorage.removeItem('vps_user');
        window.location.href = '/login';
        return;
      }

      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {}
      }

      // Fetch fresh user profile from API (sync avatar_url, role, google_id)
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.status === 431 || res.status === 401) {
            console.warn(`Session expired or invalid (HTTP ${res.status}), clearing stored credentials.`);
            localStorage.removeItem('vps_token');
            localStorage.removeItem('vps_user');
            setToken(null);
            setUser(null);
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return;
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('vps_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {});
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('vps_token', newToken);
    localStorage.setItem('vps_user', JSON.stringify(newUser));
  };

  const updateUser = (newUser: User, newToken?: string) => {
    setUser(newUser);
    localStorage.setItem('vps_user', JSON.stringify(newUser));
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('vps_token', newToken);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('vps_token');
    localStorage.removeItem('vps_user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
