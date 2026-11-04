'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, ShieldAlert, X, ArrowRight } from 'lucide-react';

interface SessionExpiredDetail {
  reason?: 'central_logout' | 'api_unauthorized' | 'token_expired';
}

export default function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    // Clear any leftover local session tokens
    try {
      localStorage.removeItem('vps_token');
      localStorage.removeItem('vps_user');
      localStorage.removeItem('vps_auth_mode');
    } catch {}

    setIsOpen(false);
    // Smoothly redirect to home of subsystem
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, []);

  const handleLoginAgain = useCallback(() => {
    try {
      localStorage.removeItem('vps_token');
      localStorage.removeItem('vps_user');
      localStorage.removeItem('vps_auth_mode');
    } catch {}

    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      const centralLoginUrl = `https://panel.cric.ac.th/login?redirect_uri=${encodeURIComponent(currentUrl)}&app=plan`;
      window.location.href = centralLoginUrl;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do not show expired modal on the login page itself or public setup
    const pathname = window.location.pathname;
    if (pathname.includes('/login') || pathname.startsWith('/setup')) {
      return;
    }

    const onSessionExpired = (e: Event) => {
      console.warn('[SessionExpiredModal] Session expired event received:', (e as CustomEvent<SessionExpiredDetail>).detail);
      setIsOpen(true);
    };

    window.addEventListener('cric:session-expired', onSessionExpired);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('cric:session-expired', onSessionExpired);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 overflow-hidden text-center transform transition-all scale-100">
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center mb-5 text-amber-600 dark:text-amber-400 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          เซสชันการใช้งานหมดอายุ
        </h3>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
          Session Expired
        </p>

        {/* Description */}
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          เซสชันของคุณหมดอายุ หรือมีการออกจากระบบจากหน้าต่างอื่น กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อทำงานต่อในหน้านี้
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleClose}
            type="button"
            className="w-full sm:w-1/2 order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            กลับหน้าแรก
          </button>

          <button
            onClick={handleLoginAgain}
            type="button"
            className="w-full sm:w-1/2 order-1 sm:order-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบใหม่</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
}
