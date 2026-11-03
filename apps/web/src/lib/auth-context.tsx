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
  department_ids?: number[];
  division_ids?: number[];
  department_name?: string;
  division_name?: string;
  division_code?: string;
  departments?: {
    id: number;
    name: string;
    division_id: number;
    division?: {
      id: number;
      name: string;
      code: string;
    };
  }[];
  divisions?: {
    id: number;
    name: string;
    code: string;
  }[];
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
    const isLocalMode = typeof window !== 'undefined' && localStorage.getItem('vps_auth_mode') === 'local';

    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('vps_token');
      localStorage.removeItem('vps_user');
      localStorage.removeItem('vps_auth_mode');
    } catch {}

    // Cross-tab broadcast for immediate in-system tabs sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('cric_sso_channel');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      }
      localStorage.setItem('cric_sso_logout_event', Date.now().toString());
    } catch {}

    // If local admin or test mode, perform isolated logout without touching Central SSO
    if (isLocalMode) {
      window.location.href = '/login?logout=1';
      return;
    }

    // Single Sign-Out (SLO): Clear shared root domain (.cric.ac.th) and host cookies
    try {
      const expireStr = '=; Path=/; Domain=.cric.ac.th; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'cric_logged_in' + expireStr;
      document.cookie = 'cric_sso_session' + expireStr;
      document.cookie = 'cric_active_role' + expireStr;
      document.cookie = 'cric_user_profile' + expireStr;

      const hostExpireStr = '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'cric_logged_in' + hostExpireStr;
      document.cookie = 'cric_sso_session' + hostExpireStr;
      document.cookie = 'cric_active_role' + hostExpireStr;
      document.cookie = 'cric_user_profile' + hostExpireStr;
    } catch {}

    // Invalidate Central SSO Session on Keycloak and redirect back to Plan login
    const postLogoutRedirect = encodeURIComponent(window.location.origin + '/login?logout=1');
    const ssoUrl = process.env.NEXT_PUBLIC_KEYCLOAK_PUBLIC_URL || 'https://sso.cric.ac.th';
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'cric-college';
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'cric-plan-app';
    window.location.href = `${ssoUrl}/realms/${realm}/protocol/openid-connect/logout?client_id=${clientId}&post_logout_redirect_uri=${postLogoutRedirect}`;
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
