'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SsoSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip public external routes like setup or callback
    if (
      pathname?.startsWith('/setup') ||
      pathname === '/auth/callback'
    ) {
      return;
    }

    const isCricDomain = window.location.hostname.includes('cric.ac.th') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    const isTokenValid = (token: string): boolean => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    };

    let isSyncing = false;

    const syncCentralSessionState = () => {
      // Pause checks when tab is minimized or hidden in background
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isSyncing) return;

      const token = localStorage.getItem('vps_token');
      const hasCricCookie = document.cookie.split(';').some((c) => c.trim().startsWith('cric_logged_in=true'));
      const ssoSessionToken = getCookie('cric_sso_session');

      if (isCricDomain) {
        // CASE 1: Plan system is logged in with SSO, but Central Session (cric_logged_in) was terminated
        if (token && !hasCricCookie && ssoSessionToken === null) {
          const isLocalAdmin = localStorage.getItem('vps_auth_mode') === 'local';
          if (!isLocalAdmin) {
            console.warn('[SSO Guard] Central session has been logged out from Portal. Logging out Plan system...');
            localStorage.removeItem('vps_token');
            localStorage.removeItem('vps_user');
            localStorage.removeItem('vps_auth_mode');
            window.location.href = window.location.origin + '/login?expired=1';
            return;
          }
        }

        // CASE 2: Plan system is NOT logged in, but user has an active Central SSO Session from Portal
        const isLoggedOutUrl = window.location.search.includes('logout=1') || window.location.search.includes('expired=1');
        if (!token && ssoSessionToken && isTokenValid(ssoSessionToken) && !isLoggedOutUrl) {
          isSyncing = true;
          console.log('[SSO Guard] Central SSO session found, performing instant auto-login...');
          fetch('/api/v1/auth/sso/sync-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: ssoSessionToken }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.data?.token) {
                localStorage.setItem('vps_token', data.data.token);
                localStorage.setItem('vps_user', JSON.stringify(data.data.user));
                localStorage.setItem('vps_auth_mode', 'sso');
                window.dispatchEvent(new CustomEvent('user-updated', { detail: data.data.user }));
                if (pathname === '/login') {
                  window.location.href = '/dashboard';
                }
              }
            })
            .catch(() => {})
            .finally(() => {
              isSyncing = false;
            });
        }
      }
    };

    // Cross-tab broadcast channel for immediate synchronous SLO (Single Log Out)
    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('cric_sso_channel');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'LOGOUT') {
            console.log('[SSO Guard] Received cross-tab LOGOUT broadcast');
            const isLocal = localStorage.getItem('vps_auth_mode') === 'local';
            if (!isLocal) {
              localStorage.removeItem('vps_token');
              localStorage.removeItem('vps_user');
              localStorage.removeItem('vps_auth_mode');
              if (pathname !== '/login') {
                window.location.href = '/login?expired=1';
              }
            }
          }
        };
      }
    } catch {}

    // Storage event listener for cross-tab sync fallback
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cric_sso_logout_event') {
        const isLocal = localStorage.getItem('vps_auth_mode') === 'local';
        if (!isLocal) {
          localStorage.removeItem('vps_token');
          localStorage.removeItem('vps_user');
          localStorage.removeItem('vps_auth_mode');
          if (pathname !== '/login') {
            window.location.href = '/login?expired=1';
          }
        }
      }
    };
    window.addEventListener('storage', onStorage);

    // Initial check
    syncCentralSessionState();

    const onFocus = () => syncCentralSessionState();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncCentralSessionState();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const interval = setInterval(() => {
      if (!document.hidden) {
        syncCentralSessionState();
      }
    }, 4000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
      if (channel) channel.close();
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
