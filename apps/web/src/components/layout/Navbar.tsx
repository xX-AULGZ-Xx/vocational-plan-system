'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import {
  LogOut,
  User as UserIcon,
  FileText,
  ChevronDown,
  Sparkles,
  Shield,
  CheckCircle2,
  Users,
  Building2,
  Compass,
  Award,
  Menu,
  X,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function Navbar({ mobileMenuOpen, setMobileMenuOpen }: NavbarProps) {
  const { user, login, logout } = useAuth();
  const { collegeLogoUrl, collegeName, collegeNameEn, enableTestMode } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);
  const [switching, setSwitching] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchDemoAccounts();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDemoAccounts = async () => {
    try {
      const res = await fetch('/api/v1/auth/demo-accounts');
      const data = await res.json();
      if (data.success) {
        setDemoAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchRole = async (username: string) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.token, data.user);
        setShowSwitcher(false);
        // Refresh current page to apply new permissions
        window.location.reload();
      } else {
        showAlert.error('สลับบทบาทไม่สำเร็จ', data.message);
      }
    } catch (err) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสลับบทบาท');
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'ผู้ดูแลระบบ (Admin)', bg: 'bg-amber-100 text-amber-900 border-amber-300', icon: Shield };
      case 'DIRECTOR':
        return { label: 'ผู้อำนวยการสถานศึกษา', bg: 'bg-rose-100 text-rose-900 border-rose-300', icon: Award };
      case 'PLANNING_OFFICER':
        return { label: 'งานแผนงานฯ (ออกรหัส)', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300', icon: Compass };
      case 'DEPUTY_DIRECTOR':
        return { label: 'รอง ผอ. ประจำฝ่าย', bg: 'bg-purple-100 text-purple-900 border-purple-300', icon: Building2 };
      case 'HEAD_DEPT':
        return { label: 'หัวหน้าแผนกวิชา/งาน', bg: 'bg-blue-100 text-blue-900 border-blue-300', icon: Users };
      case 'TEACHER':
      default:
        return { label: 'ครูผู้สอน / ผู้เสนอโครงการ', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: CheckCircle2 };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;
  const shortName = collegeName.replace('วิทยาลัยการอาชีพ', 'วก.').replace('วิทยาลัยอาชีวศึกษา', 'วอศ.').replace('วิทยาลัยเทคนิค', 'วท.');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Mobile Menu Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user && setMobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition"
              title="เปิด/ปิดเมนูหลัก"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {collegeLogoUrl ? (
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center p-0 shrink-0">
              <img
                src={collegeLogoUrl}
                alt={collegeName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.logo-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'logo-fallback w-full h-full rounded-theme text-white flex items-center justify-center font-bold text-xs';
                    fallback.style.backgroundColor = 'var(--color-primary, #1e3a8a)';
                    fallback.innerText = shortName.substring(0, 3);
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          ) : (
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-theme flex items-center justify-center text-white font-bold shadow-md shrink-0 transition-all duration-300"
              style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
            >
              <span className="text-lg sm:text-xl font-black tracking-tight">{shortName.substring(0, 3)}</span>
            </div>
          )}
          <div>
            <Link
              href="/dashboard"
              className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 hover:text-blue-900 transition flex items-center gap-1.5"
            >
              <span className="line-clamp-1">ระบบบริหารโครงการ</span>
              <span
                className="hidden md:inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold border shrink-0 transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary, #1e3a8a) 12%, transparent)',
                  color: 'var(--color-primary, #1e3a8a)',
                  borderColor: 'color-mix(in srgb, var(--color-primary, #1e3a8a) 30%, transparent)',
                }}
              >
                {shortName}
              </span>
            </Link>
            <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block">
              {collegeNameEn} Planning & Project Management System
            </p>
          </div>
        </div>

        {/* Right User Bar & Quick Role Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <div className="flex items-center space-x-2.5">
              {/* Role Badge / Quick Role Switcher Dropdown */}
              <div className="relative" ref={switcherRef}>
                {mounted && enableTestMode ? (
                  <button
                    onClick={() => setShowSwitcher(!showSwitcher)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs ${roleInfo.bg} hover:brightness-95`}
                    title="คลิกเพื่อสลับบทบาทผู้ใช้งานสำหรับทดสอบระบบ (Quick Role Switcher)"
                  >
                    <RoleIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{roleInfo.label}</span>
                    <ChevronDown className="w-3 h-3 text-slate-600" />
                  </button>
                ) : (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-2xs ${roleInfo.bg}`}
                    title={`ตำแหน่ง: ${roleInfo.label}`}
                  >
                    <RoleIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{roleInfo.label}</span>
                  </div>
                )}

                {/* Switcher Dropdown Menu */}
                {showSwitcher && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>สลับบทบาทผู้ใช้งาน (Demo / RBAC)</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        เลือกบัญชีตัวแทนเพื่อทดสอบสิทธิ์ของแต่ละบทบาท
                      </p>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1 py-1">
                      {demoAccounts.map((acc) => {
                        const accBadge = getRoleBadge(acc.role);
                        const isCurrent = user?.username === acc.username;
                        return (
                          <button
                            key={acc.username}
                            onClick={() => handleSwitchRole(acc.username)}
                            disabled={switching || isCurrent}
                            className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between text-xs ${
                              isCurrent
                                ? 'bg-blue-50 border border-blue-200 text-blue-950 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <p className="font-semibold truncate">{acc.full_name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {accBadge.label} {acc.department_name ? `• ${acc.department_name}` : ''}
                              </p>
                            </div>
                            {isCurrent && (
                              <span
                                className="text-[10px] text-white px-1.5 py-0.5 rounded shrink-0"
                                style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
                              >
                                ใช้งานอยู่
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* In-App Real-time Notification Bell */}
              <NotificationBell />

              {/* User Profile info */}
              <div className="flex items-center pl-2 border-l border-slate-200 space-x-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-xs flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">{user.full_name}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {user.email || user.department?.name || user.position || 'วิทยาลัยการอาชีพเชียงราย'}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="ออกจากระบบ"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 text-xs font-bold rounded-theme text-white transition shadow-xs"
              style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
