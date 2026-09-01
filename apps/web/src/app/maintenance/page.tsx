'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw, Clock, ArrowRight } from 'lucide-react';

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<{
    enabled: boolean;
    message: string;
  }>({
    enabled: true,
    message: 'ระบบกำลังปิดปรับปรุงชั่วคราวเพื่ออัปเดตเวอร์ชันใหม่ กรุณารอสักครู่...',
  });

  const checkStatus = async () => {
    try {
      setChecking(true);
      const res = await fetch('/api/v1/system-update/maintenance/status').then((r) => r.json());
      if (res?.data) {
        setMaintenanceInfo(res.data);
        if (!res.data.enabled) {
          window.location.href = '/dashboard';
        }
      }
    } catch (e) {
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 text-center text-white shadow-2xl backdrop-blur-md space-y-6">
        <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">ระบบกำลังปิดปรับปรุงชั่วคราว</h1>
          <p className="text-sm text-slate-300 leading-relaxed">{maintenanceInfo.message}</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>ระบบจะกลับมาเปิดให้บริการโดยอัตโนมัติเมื่อการอัปเดตเสร็จสิ้น</span>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'กำลังตรวจสอบสถานะ...' : 'ตรวจสอบสถานะระบบอีกครั้ง'}</span>
          </button>

          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1"
          >
            <span>เข้าสู่ระบบด้วยสิทธิ์ผู้ดูแลระบบ (Admin)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
