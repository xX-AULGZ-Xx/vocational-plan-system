'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const authError = searchParams.get('error') || searchParams.get('error_description');

    if (authError) {
      setError(authError);
      return;
    }

    if (!code) {
      setError('ไม่พบรหัสยืนยันตัวตน (Authorization Code) จาก Central SSO');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;

    fetch('/api/v1/auth/keycloak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'การยืนยันตัวตนกับ Central SSO ล้มเหลว');
        }
        localStorage.setItem('vps_auth_mode', 'sso');
        login(data.token, data.user);
        router.replace('/dashboard');
      })
      .catch((err: any) => {
        setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
      });
  }, [searchParams, router, login]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">เข้าสู่ระบบไม่สำเร็จ</h2>
          <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
          >
            กลับสู่หน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800">กำลังยืนยันตัวตนกับ Central SSO...</h2>
        <p className="text-xs text-slate-500">กรุณารอสักครู่ ระบบกำลังจัดเตรียมข้อมูลบัญชีผู้ใช้ของคุณ</p>
        <div className="flex justify-center pt-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
