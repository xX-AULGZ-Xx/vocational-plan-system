'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
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
  const { user } = useAuth();
  const { themeSidebarStyle, themePrimaryColor, collegeLogoUrl, collegeName, developerInfo } = useSettings();

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

  const allDivisionNav = [
    { name: 'ฝ่ายวิชาการ', href: '/divisions/acad', code: 'acad', icon: BookOpen },
    { name: 'ฝ่ายบริหารทรัพยากร', href: '/divisions/res', code: 'res', icon: Building2 },
    { name: 'ฝ่ายพัฒนากิจการฯ', href: '/divisions/dev', code: 'dev', icon: Users },
    { name: 'ฝ่ายแผนงานและความร่วมมือ', href: '/divisions/strat', code: 'strat', icon: Compass },
  ];

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

  const showDivisions = user && ['DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN'].includes(role);
  const divisionNav = showDivisions ? allDivisionNav : [];

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
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar / Slide-over Drawer */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-72 lg:w-64 min-h-screen lg:min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 no-print border-r transform lg:transform-none transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none overflow-y-auto ${sidebarBg} ${
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-theme text-sm font-medium transition ${
                      active ? '' : inactiveLink
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : isLightSidebar ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
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
                              backgroundColor: isLightSidebar ? '#f1f5f9' : '#1e293b',
                              color: 'var(--color-accent, #0d9488)',
                              borderLeftWidth: '3px',
                              borderLeftColor: 'var(--color-accent, #0d9488)',
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
            ? 'bg-slate-50 border-slate-200 text-slate-500'
            : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
        }`}>
          <div className={`font-semibold mb-1 flex items-center justify-between ${isLightSidebar ? 'text-slate-800' : 'text-slate-200'}`}>
            <span>ข้อมูลผู้พัฒนา</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-primary/10 text-theme-primary font-mono font-bold">v1.0</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {developerInfo || 'พัฒนาระบบโดย งานส่งเสริมการวิจัย นวัตกรรม และสิ่งประดิษฐ์ ร่วมกับ งานศูนย์ข้อมูลสารสนเทศ'}
          </p>
        </div>
      </aside>
    </>
  );
}
