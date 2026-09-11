'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useNotifications } from '@/lib/notification-context';
import {
  LayoutDashboard,
  Calendar,
  FolderKanban,
  FilePlus,
  CheckCircle2,
  BookOpen,
  Building2,
  Users,
  Compass,
  FileText,
  Clock,
  Settings,
  ArrowUpCircle,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen = false, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, token } = useAuth();
  const { unreadCount, subscribeDataUpdate } = useNotifications();
  const { themeSidebarStyle, themePrimaryColor, collegeLogoUrl, collegeName, developerInfo, divisions } = useSettings();

  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const isApprover = user && ['HEAD_DEPT', 'DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN'].includes(user.role);

  const fetchPendingApprovals = useCallback(async () => {
    if (!user || !isApprover) return;
    try {
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : null);
      const headers: any = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/v1/approvals/inbox', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPendingApprovalCount(data.data.length);
      }
    } catch (e) {
      // ignore
    }
  }, [user, token, isApprover]);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  useEffect(() => {
    const unsubscribe = subscribeDataUpdate((event) => {
      if (event.scope === 'PROJECTS' || event.scope === 'APPROVALS') {
        fetchPendingApprovals();
      }
    });
    return () => unsubscribe();
  }, [subscribeDataUpdate, fetchPendingApprovals]);

  const shortName = collegeName?.replace('วิทยาลัยการอาชีพ', 'วก.').replace('วิทยาลัยอาชีวศึกษา', 'วอศ.').replace('วิทยาลัยเทคนิค', 'วท.') || 'วก.';

  const role = user?.role || 'TEACHER';
  const isLightSidebar = themeSidebarStyle === 'light';

  // Base navigation items
  const allMainNav = [
    { name: 'ภาพรวมระบบ', href: '/dashboard', icon: LayoutDashboard, roles: ['TEACHER', 'HEAD_DEPT', 'DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN'] },
    { name: 'โครงการของฉัน', href: '/my-projects', icon: FolderKanban, roles: ['TEACHER', 'HEAD_DEPT', 'PLANNING_OFFICER', 'ADMIN'] },
    { name: 'เขียนโครงการใหม่', href: '/projects/new', icon: FilePlus, roles: ['TEACHER', 'HEAD_DEPT', 'PLANNING_OFFICER', 'ADMIN'] },
    { name: 'แผนปฏิบัติงาน / ไทม์ไลน์', href: '/schedule', icon: Calendar, roles: ['TEACHER', 'HEAD_DEPT', 'DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN'] },
    { name: 'คิวงานและอนุมัติ', href: '/approvals', icon: CheckCircle2, roles: ['HEAD_DEPT', 'DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN'] },
    { name: 'การแจ้งเตือน', href: '/notifications', icon: Clock, roles: ['TEACHER', 'HEAD_DEPT', 'DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN'] },
  ];

  // Dynamic division navigation based on system settings / database
  const getDivisionIcon = (code: string) => {
    switch (code?.toLowerCase()) {
      case 'acad': return BookOpen;
      case 'res': return Building2;
      case 'dev': return Users;
      case 'strat': return Compass;
      default: return Building2;
    }
  };

  const defaultDivisionList = [
    { name: 'ฝ่ายวิชาการ', href: '/divisions/acad', code: 'acad', icon: BookOpen },
    { name: 'ฝ่ายบริหารทรัพยากร', href: '/divisions/res', code: 'res', icon: Building2 },
    { name: 'ฝ่ายพัฒนากิจการนักเรียน นักศึกษา', href: '/divisions/dev', code: 'dev', icon: Users },
    { name: 'ฝ่ายแผนงานและความร่วมมือ', href: '/divisions/strat', code: 'strat', icon: Compass },
  ];

  const allDivisionNav = (divisions && divisions.length > 0)
    ? divisions.map((d) => ({
        name: d.name,
        href: `/divisions/${d.code.toLowerCase()}`,
        code: d.code.toLowerCase(),
        icon: getDivisionIcon(d.code),
      }))
    : defaultDivisionList;

  const allAdminNav = [
    { name: 'จัดการผู้ใช้งาน', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { name: 'จัดการฝ่ายและแผนกวิชา/งาน', href: '/admin/departments', icon: Building2, roles: ['ADMIN'] },
    { name: 'จัดการเทมเพลตเอกสาร', href: '/admin/templates', icon: FileText, roles: ['ADMIN', 'PLANNING_OFFICER'] },
    { name: 'ตั้งค่าระบบสถานศึกษา', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
    { name: 'อัปเดตและสำรองระบบ', href: '/admin/system-update', icon: ArrowUpCircle, roles: ['ADMIN'] },
  ];

  // Filter navigation by role
  const mainNav = user
    ? allMainNav.filter((item) => item.roles.includes(role))
    : [
        { name: 'ภาพรวมระบบ (Dashboard)', href: '/dashboard', icon: LayoutDashboard },
        { name: 'แผนปฏิบัติงาน / ปฏิทิน', href: '/schedule', icon: Calendar },
      ];

  // Division navigation available to all users
  const showDivisions = true;
  const divisionNav = allDivisionNav;

  const adminNav = user ? allAdminNav.filter((item) => item.roles.includes(role)) : [];

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const handleLinkClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const sidebarBg = isLightSidebar ? 'bg-white text-slate-700 border-slate-200 shadow-sm' : 'bg-slate-900 text-slate-200 border-slate-800';
  const headingColor = isLightSidebar ? 'text-slate-400 font-bold' : 'text-slate-400';
  const inactiveLink = isLightSidebar ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 hover:bg-slate-800 hover:text-white';
  const inactiveDivision = isLightSidebar ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className="fixed inset-0 top-16 bg-black/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar / Slide-over Drawer */}
      <aside
        className={`fixed lg:sticky top-16 left-0 bottom-0 z-30 lg:z-10 w-72 lg:w-64 h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 no-print border-r transform lg:transform-none transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none overflow-y-auto ${sidebarBg} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Mobile Drawer Header */}
          <div className={`flex items-center justify-between pb-2 border-b lg:hidden ${isLightSidebar ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2">
              {collegeLogoUrl ? (
                <div className="w-8 h-8 flex items-center justify-center p-0 shrink-0">
                  <img
                    src={collegeLogoUrl}
                    alt={collegeName}
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-theme text-white flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
                >
                  {shortName.substring(0, 3)}
                </div>
              )}
              <span className={`font-bold text-sm ${isLightSidebar ? 'text-slate-900' : 'text-white'}`}>เมนูระบบ</span>
            </div>
            <button
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className={`p-1 rounded-lg ${isLightSidebar ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className={`text-xs uppercase tracking-wider px-3 mb-2 ${headingColor}`}>
              เมนูหลัก
            </div>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    style={
                      active
                        ? {
                            backgroundColor: 'var(--color-primary, #1e3a8a)',
                            color: '#ffffff',
                            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary, #1e3a8a) 40%, transparent)',
                          }
                        : {}
                    }
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-theme text-sm font-medium transition ${
                      active ? '' : inactiveLink
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : isLightSidebar ? 'text-slate-500' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {/* Badge for approvals queue */}
                    {item.href === '/approvals' && isApprover && (
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-full shrink-0 transition-all ${
                          active
                            ? pendingApprovalCount > 0
                              ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                              : 'bg-white/20 text-white'
                            : pendingApprovalCount > 0
                            ? 'bg-amber-500 text-white font-black shadow-xs animate-pulse'
                            : isLightSidebar
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pendingApprovalCount}
                      </span>
                    )}

                    {/* Badge for notifications */}
                    {item.href === '/notifications' && unreadCount > 0 && (
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-full shrink-0 transition-all ${
                          active
                            ? 'bg-rose-500 text-white font-black shadow-xs'
                            : 'bg-rose-500 text-white font-black shadow-xs'
                        }`}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {divisionNav.length > 0 && (
            <div>
              <div className={`text-xs uppercase tracking-wider px-3 mb-2 ${headingColor}`}>
                แยกตาม 4 ฝ่ายบริหาร
              </div>
              <nav className="space-y-1">
                {divisionNav.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      style={
                        active
                          ? {
                              backgroundColor: 'var(--color-primary, #1e3a8a)',
                              color: '#ffffff',
                              boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary, #1e3a8a) 40%, transparent)',
                            }
                          : {}
                      }
                      className={`flex items-center gap-3 px-3 py-2 rounded-theme text-xs font-medium transition ${
                        active ? '' : inactiveDivision
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : ''}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {adminNav.length > 0 && (
            <div>
              <div className={`text-xs uppercase tracking-wider px-3 mb-2 ${headingColor}`}>
                {role === 'ADMIN' ? 'ผู้ดูแลระบบ (Admin)' : 'งานบริหารและแม่แบบ'}
              </div>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      style={
                        active
                          ? {
                              backgroundColor: isLightSidebar ? '#fef3c7' : '#1e293b',
                              color: isLightSidebar ? '#92400e' : '#fbbf24',
                              borderLeftWidth: '3px',
                              borderLeftColor: '#f59e0b',
                            }
                          : {}
                      }
                      className={`flex items-center gap-3 px-3 py-2 rounded-theme text-xs font-medium transition ${
                        active ? '' : inactiveDivision
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        <div className={`p-3 rounded-theme border text-xs mt-6 transition-colors ${
          isLightSidebar
            ? 'bg-slate-50 border-slate-200 text-slate-600'
            : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
        }`}>
          <div className={`font-semibold mb-1 flex items-center justify-between ${isLightSidebar ? 'text-slate-900' : 'text-slate-100'}`}>
            <span>ข้อมูลผู้พัฒนา</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              isLightSidebar
                ? 'bg-slate-200 text-slate-800'
                : 'bg-slate-700 text-slate-200'
            }`}>v1.0</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {developerInfo || 'พัฒนาระบบโดย งานส่งเสริมการวิจัย นวัตกรรม และสิ่งประดิษฐ์ ร่วมกับ งานศูนย์ข้อมูลสารสนเทศ'}
          </p>
        </div>
      </aside>
    </>
  );
}
