'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AccessDeniedProps {
  requiredRole?: string;
  allowedRoles?: string[];
}

export default function AccessDenied({ requiredRole, allowedRoles }: AccessDeniedProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-1">ไม่มีสิทธิ์เข้าถึงหน้านี้ (Access Denied)</h2>
      <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
        หน้านี้สงวนสิทธิ์เฉพาะผู้ใช้ที่มีบทบาท{' '}
        <span className="font-bold text-slate-800">
          {allowedRoles ? allowedRoles.join(', ') : requiredRole || 'ผู้ดูแลระบบ (ADMIN)'}
        </span>
        <br />
        บทบาทปัจจุบันของคุณคือ: <span className="font-bold text-blue-900">[{user?.role || 'ไม่ระบุ'}]</span>
      </p>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-md mb-6 text-left space-y-1">
        <div className="font-bold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>ต้องการทดสอบเข้าใช้งานหน้านี้?</span>
        </div>
        <p className="text-[11px] text-amber-800">
          คุณสามารถใช้เมนู <b>"สลับบทบาทผู้ใช้งาน"</b> ที่แถบเมนูด้านบนขวา (Navbar) เพื่อเปลี่ยนเป็นบทบาทที่ได้รับอนุญาตได้ทันที
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition"
        >
          <Home className="w-4 h-4" />
          <span>กลับสู่หน้าหลัก</span>
        </Link>
      </div>
    </div>
  );
}
