'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import AccessDenied from '@/components/common/AccessDenied';
import ModalPortal from '@/components/ui/ModalPortal';
import { showAlert } from '@/lib/sweetalert';
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Shield,
  ShieldAlert,
  FolderKanban,
  CheckCircle2,
  Users,
  Settings,
  Server,
  Calendar,
  Clock,
  ArrowRight,
  Globe,
  Laptop,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  Lock,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface AuditLogUser {
  id: string;
  full_name: string;
  email: string | null;
  username: string;
  role: string;
  avatar_url: string | null;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  target_id: string | null;
  target_type: string | null;
  description: string;
  old_data: any | null;
  new_data: any | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: AuditLogUser | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  moduleCounts: Record<string, number>;
  actionCounts: Record<string, number>;
  uniqueUsersCount: number;
}

const MODULE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  AUTH: {
    label: 'เข้าสู่ระบบ / ยืนยันตัวตน',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: Lock,
  },
  PROJECT: {
    label: 'โครงการ',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: FolderKanban,
  },
  APPROVAL: {
    label: 'การเสนอ / อนุมัติ',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: CheckCircle2,
  },
  USER: {
    label: 'จัดการผู้ใช้',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Users,
  },
  ADMIN: {
    label: 'ผู้ดูแลระบบ',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Shield,
  },
  SYSTEM: {
    label: 'ระบบส่วนกลาง',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Server,
  },
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN_PASSWORD: { label: 'เข้าสู่ระบบ (รหัสผ่าน)', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  LOGIN_GOOGLE: { label: 'เข้าสู่ระบบ (Google)', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  LOGIN_FAILED: { label: 'เข้าสู่ระบบไม่สำเร็จ', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  LOGOUT: { label: 'ออกจากระบบ', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  PROFILE_UPDATE: { label: 'แก้ไขโปรไฟล์', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  PROJECT_CREATE: { label: 'สร้างโครงการใหม่', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  PROJECT_UPDATE: { label: 'แก้ไขโครงการ', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  PROJECT_DELETE: { label: 'ลบโครงการ', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  PROJECT_SUBMIT: { label: 'ส่งโครงการขออนุมัติ', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  PROJECT_APPROVE: { label: 'อนุมัติ / เห็นชอบ', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  PROJECT_FINAL_APPROVE: { label: 'อนุมัติขั้นสุดท้าย (ผอ.)', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  PROJECT_REVISION_REQUEST: { label: 'ส่งกลับแก้ไข', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  PROJECT_REJECT: { label: 'ไม่อนุมัติ / ยกเลิก', color: 'text-red-600 bg-red-50 border-red-200' },
  USER_CREATE: { label: 'เพิ่มผู้ใช้ใหม่', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  USER_UPDATE: { label: 'แก้ไขข้อมูลผู้ใช้', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  USER_TOGGLE_STATUS: { label: 'เปลี่ยนสถานะผู้ใช้', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  USER_RESET_PASSWORD: { label: 'รีเซ็ตรหัสผ่าน', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  USER_DELETE: { label: 'ลบผู้ใช้', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  SETTINGS_UPDATE: { label: 'แก้ไขการตั้งค่าระบบ', color: 'text-violet-600 bg-violet-50 border-violet-200' },
};

const ROLE_LABELS: Record<string, { label: string; bg: string }> = {
  ADMIN: { label: 'ADMIN', bg: 'bg-slate-900 text-amber-300' },
  DIRECTOR: { label: 'ผู้อำนวยการ', bg: 'bg-rose-100 text-rose-800' },
  PLANNING_OFFICER: { label: 'จนท. แผนงาน', bg: 'bg-amber-100 text-amber-800' },
  DEPUTY_DIRECTOR: { label: 'รอง ผอ.', bg: 'bg-purple-100 text-purple-800' },
  HEAD_DEPT: { label: 'หน. แผนก/งาน', bg: 'bg-blue-100 text-blue-800' },
  TEACHER: { label: 'ครู / บุคลากร', bg: 'bg-emerald-100 text-emerald-800' },
};

export default function AdminAuditLogsPage() {
  const { user: currentUser, token } = useAuth();

  // Protect route
  if (currentUser && currentUser.role !== 'ADMIN') {
    return <AccessDenied requiredRole="ผู้ดูแลระบบ (ADMIN)" />;
  }

  // Data states
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Inspection Modal state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/admin/audit-logs/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  }, [token]);

  // Compute effective date range based on preset
  const computedDateRange = useMemo(() => {
    if (datePreset === 'ALL') {
      return { start: '', end: '' };
    }
    if (datePreset === 'CUSTOM') {
      return { start: startDate, end: endDate };
    }
    const end = new Date();
    const start = new Date();
    if (datePreset === 'TODAY') {
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === '7DAYS') {
      start.setDate(start.getDate() - 7);
    } else if (datePreset === '30DAYS') {
      start.setDate(start.getDate() - 30);
    }
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [datePreset, startDate, endDate]);

  // Fetch audit logs with active filters
  const fetchLogs = useCallback(
    async (pageToFetch = pagination.page, limitToFetch = pagination.limit) => {
      if (!token) return;
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(pageToFetch));
        queryParams.set('limit', String(limitToFetch));

        if (selectedModule && selectedModule !== 'ALL') {
          queryParams.set('module', selectedModule);
        }
        if (selectedAction && selectedAction !== 'ALL') {
          queryParams.set('action', selectedAction);
        }
        if (search.trim()) {
          queryParams.set('search', search.trim());
        }
        if (computedDateRange.start) {
          queryParams.set('start_date', computedDateRange.start);
        }
        if (computedDateRange.end) {
          queryParams.set('end_date', computedDateRange.end);
        }

        const res = await fetch(`/api/v1/admin/audit-logs?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success && data.data) {
          setLogs(data.data.logs || []);
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
        } else {
          showAlert.error('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถดึงข้อมูลประวัติการใช้งานได้');
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        showAlert.error('ข้อผิดพลาดการเชื่อมต่อ', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อดึงประวัติได้');
      } finally {
        setLoading(false);
      }
    },
    [token, pagination.page, pagination.limit, selectedModule, selectedAction, search, computedDateRange]
  );

  // Initial and reactive load
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  useEffect(() => {
    if (token) {
      fetchLogs(1, pagination.limit);
    }
  }, [token, selectedModule, selectedAction, search, computedDateRange]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedModule && selectedModule !== 'ALL') {
        queryParams.set('module', selectedModule);
      }
      if (selectedAction && selectedAction !== 'ALL') {
        queryParams.set('action', selectedAction);
      }
      if (search.trim()) {
        queryParams.set('search', search.trim());
      }
      if (computedDateRange.start) {
        queryParams.set('start_date', computedDateRange.start);
      }
      if (computedDateRange.end) {
        queryParams.set('end_date', computedDateRange.end);
      }

      const res = await fetch(`/api/v1/admin/audit-logs/export?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Export request failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      a.download = `audit_logs_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showAlert.success('ส่งออกข้อมูลสำเร็จ', 'ดาวน์โหลดไฟล์บันทึกประวัติการใช้งานเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Export error:', err);
      showAlert.error('ส่งออกไม่สำเร็จ', 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ CSV');
    } finally {
      setExporting(false);
    }
  };

  // Helper copy JSON
  const handleCopyJSON = (data: any, key: string) => {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Format Thai DateTime
  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedModule('ALL');
    setSelectedAction('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedModule !== 'ALL' ||
    selectedAction !== 'ALL' ||
    datePreset !== 'ALL';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center font-bold">
              <History className="w-5 h-5 text-theme-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                บันทึกประวัติการใช้งาน (Audit Logs)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                ระบบตรวจสอบย้อนหลัง บันทึกกิจกรรม การเข้าสู่ระบบ และการเปลี่ยนแปลงข้อมูลทั้งหมด
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchStats();
              fetchLogs();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-theme-primary hover:bg-theme-primary/90 rounded-xl transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'กำลังส่งออก...' : 'ส่งออก CSV (Excel)'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">บันทึกทั้งหมด</p>
            <p className="text-2xl font-extrabold text-slate-800">
              {stats ? (stats.totalLogs ?? 0).toLocaleString() : '...'}
            </p>
            <span className="text-[11px] text-slate-400">รายการทั้งหมดในระบบ</span>
          </div>
        </div>

        {/* Today's Logs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">บันทึกวันนี้</p>
            <p className="text-2xl font-extrabold text-slate-800">
              {stats ? (stats.todayLogs ?? 0).toLocaleString() : '...'}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">กิจกรรมที่เกิดขึ้นในวันนี้</span>
          </div>
        </div>

        {/* Project & Approval Events */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">กิจกรรมโครงการ</p>
            <p className="text-2xl font-extrabold text-slate-800">
              {stats
                ? ((stats.moduleCounts?.PROJECT || 0) + (stats.moduleCounts?.APPROVAL || 0)).toLocaleString()
                : '...'}
            </p>
            <span className="text-[11px] text-slate-400">สร้าง แก้ไข เสนอ และอนุมัติ</span>
          </div>
        </div>

        {/* Unique Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ผู้ใช้งานที่มีกิจกรรม</p>
            <p className="text-2xl font-extrabold text-slate-800">
              {stats ? (stats.uniqueUsersCount ?? 0).toLocaleString() : '...'}
            </p>
            <span className="text-[11px] text-slate-400">บัญชีผู้ใช้ที่มีการบันทึก</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาข้อความ, ชื่อผู้ใช้, อีเมล, IP, หรือ รหัสเป้าหมาย..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Module Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary font-medium text-slate-700"
            >
              <option value="ALL">📦 ทุกโมดูล (All Modules)</option>
              <option value="AUTH">🔑 เข้าสู่ระบบ / ยืนยันตัวตน (AUTH)</option>
              <option value="PROJECT">📁 จัดการโครงการ (PROJECT)</option>
              <option value="APPROVAL">✅ การอนุมัติ / เสนอ (APPROVAL)</option>
              <option value="USER">👥 จัดการผู้ใช้ (USER)</option>
              <option value="ADMIN">⚙️ ผู้ดูแลระบบ (ADMIN)</option>
              <option value="SYSTEM">🖥️ ระบบส่วนกลาง (SYSTEM)</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="md:col-span-4">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary font-medium text-slate-700"
            >
              <option value="ALL">⚡ ทุกการกระทำ (All Actions)</option>
              <optgroup label="การเข้าสู่ระบบ">
                <option value="LOGIN_PASSWORD">LOGIN_PASSWORD - เข้าสู่ระบบรหัสผ่าน</option>
                <option value="LOGIN_GOOGLE">LOGIN_GOOGLE - เข้าสู่ระบบ Google</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED - เข้าสู่ระบบล้มเหลว</option>
                <option value="LOGOUT">LOGOUT - ออกจากระบบ</option>
              </optgroup>
              <optgroup label="โครงการ & อนุมัติ">
                <option value="PROJECT_CREATE">PROJECT_CREATE - สร้างโครงการ</option>
                <option value="PROJECT_UPDATE">PROJECT_UPDATE - แก้ไขโครงการ</option>
                <option value="PROJECT_DELETE">PROJECT_DELETE - ลบโครงการ</option>
                <option value="PROJECT_SUBMIT">PROJECT_SUBMIT - ส่งโครงการ</option>
                <option value="PROJECT_APPROVE">PROJECT_APPROVE - อนุมัติ/เห็นชอบ</option>
                <option value="PROJECT_FINAL_APPROVE">PROJECT_FINAL_APPROVE - อนุมัติขั้นสุดท้าย (ผอ.)</option>
                <option value="PROJECT_REVISION_REQUEST">PROJECT_REVISION_REQUEST - ส่งกลับแก้ไข</option>
                <option value="PROJECT_REJECT">PROJECT_REJECT - ไม่อนุมัติ</option>
              </optgroup>
              <optgroup label="การจัดการผู้ใช้ & ระบบ">
                <option value="USER_CREATE">USER_CREATE - เพิ่มผู้ใช้ใหม่</option>
                <option value="USER_UPDATE">USER_UPDATE - แก้ไขข้อมูลผู้ใช้</option>
                <option value="USER_TOGGLE_STATUS">USER_TOGGLE_STATUS - เปลี่ยนสถานะใช้งาน</option>
                <option value="USER_RESET_PASSWORD">USER_RESET_PASSWORD - รีเซ็ตรหัสผ่าน</option>
                <option value="USER_DELETE">USER_DELETE - ลบผู้ใช้</option>
                <option value="SETTINGS_UPDATE">SETTINGS_UPDATE - แก้ไขการตั้งค่าระบบ</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Date Presets and Custom Range */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> ช่วงเวลา:
            </span>
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'TODAY', label: 'วันนี้' },
              { id: '7DAYS', label: '7 วันที่แล้ว' },
              { id: '30DAYS', label: '30 วันที่แล้ว' },
              { id: 'CUSTOM', label: 'กำหนดเอง' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id as any)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  datePreset === preset.id
                    ? 'bg-theme-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-theme-primary"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-theme-primary"
              />
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 w-40">วันที่ & เวลา</th>
                <th className="py-3.5 px-4 w-52">ผู้ดำเนินการ</th>
                <th className="py-3.5 px-4 w-44">โมดูล & การกระทำ</th>
                <th className="py-3.5 px-4">รายละเอียดกิจกรรม</th>
                <th className="py-3.5 px-4 w-36">ข้อมูลเป้าหมาย</th>
                <th className="py-3.5 px-4 w-32">IP / อุปกรณ์</th>
                <th className="py-3.5 px-4 w-24 text-center">ดูข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-theme-primary" />
                      <span className="font-medium">กำลังโหลดข้อมูลประวัติการใช้งาน...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="w-8 h-8 text-slate-300" />
                      <span className="font-semibold text-slate-600">ไม่พบบันทึกประวัติการใช้งาน</span>
                      <span className="text-xs text-slate-400">
                        {hasActiveFilters ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง' : 'ยังไม่มีกิจกรรมที่ถูกบันทึก'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const mod = MODULE_CONFIG[log.module] || MODULE_CONFIG.SYSTEM;
                  const ModIcon = mod.icon;
                  const actionMeta = ACTION_LABELS[log.action] || {
                    label: log.action,
                    color: 'text-slate-700 bg-slate-100 border-slate-200',
                  };
                  const roleMeta = log.user?.role ? ROLE_LABELS[log.user.role] : null;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(log.created_at)}</span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        {log.user ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {log.user.avatar_url ? (
                                <img
                                  src={log.user.avatar_url}
                                  alt={log.user.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                log.user.full_name?.charAt(0) || 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{log.user.full_name}</p>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <span className="truncate">{log.user.email || log.user.username}</span>
                                {roleMeta && (
                                  <span className={`px-1.5 py-0.2 rounded-md font-semibold text-[9px] ${roleMeta.bg}`}>
                                    {roleMeta.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              <Server className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-600">ระบบอัตโนมัติ</p>
                              <span className="text-[10px] text-slate-400">System / Anonymous</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Module & Action */}
                      <td className="py-3.5 px-4 space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${mod.bg} ${mod.text} ${mod.border}`}
                        >
                          <ModIcon className="w-3 h-3" />
                          {log.module}
                        </span>
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${actionMeta.color}`}
                          >
                            {actionMeta.label}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs">
                        <p className="line-clamp-2">{log.description}</p>
                      </td>

                      {/* Target Info */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {log.target_type || log.target_id ? (
                          <div className="space-y-0.5">
                            {log.target_type && (
                              <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                                {log.target_type}
                              </span>
                            )}
                            {log.target_id && (
                              <p className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]" title={log.target_id}>
                                #{log.target_id}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* IP & Device */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-slate-600">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{log.ip_address || '127.0.0.1'}</span>
                        </div>
                      </td>

                      {/* Action View */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 text-slate-500 hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition"
                          title="ดูรายละเอียดการเปลี่ยนแปลง"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>แสดง</span>
            <select
              value={pagination.limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
                fetchLogs(1, newLimit);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-hidden"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>รายการต่อหน้า จากทั้งหมด <strong>{pagination.total.toLocaleString()}</strong> รายการ</span>
          </div>

          <div className="flex items-center gap-1 font-semibold">
            <button
              onClick={() => {
                setPagination((p) => ({ ...p, page: 1 }));
                fetchLogs(1, pagination.limit);
              }}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              title="หน้าแรก"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const prev = Math.max(1, pagination.page - 1);
                setPagination((p) => ({ ...p, page: prev }));
                fetchLogs(prev, pagination.limit);
              }}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              title="ก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg">
              หน้า {pagination.page} / {pagination.totalPages || 1}
            </span>

            <button
              onClick={() => {
                const next = Math.min(pagination.totalPages, pagination.page + 1);
                setPagination((p) => ({ ...p, page: next }));
                fetchLogs(next, pagination.limit);
              }}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              title="ถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const last = pagination.totalPages;
                setPagination((p) => ({ ...p, page: last }));
                fetchLogs(last, pagination.limit);
              }}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              title="หน้าสุดท้าย"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail & Diff Modal */}
      {selectedLog && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-theme-primary text-white">
                      {selectedLog.module}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                      {selectedLog.action}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">รายละเอียดประวัติกิจกรรม</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
                {/* Meta Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ผู้ดำเนินการ</p>
                    {selectedLog.user ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {selectedLog.user.avatar_url ? (
                            <img src={selectedLog.user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            selectedLog.user.full_name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{selectedLog.user.full_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {selectedLog.user.email || selectedLog.user.username} ({selectedLog.user.role})
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-600">ระบบอัตโนมัติ (System)</p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">วันเวลาและเครือข่าย</p>
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateTime(selectedLog.created_at)}
                      </p>
                      <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        IP: {selectedLog.ip_address || '127.0.0.1'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">คำอธิบายการกระทำ</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedLog.description}</p>
                  {(selectedLog.target_type || selectedLog.target_id) && (
                    <p className="text-xs text-slate-500 font-mono pt-1">
                      เป้าหมาย: <span className="font-bold">{selectedLog.target_type || 'Entity'}</span> (ID:{' '}
                      {selectedLog.target_id})
                    </p>
                  )}
                </div>

                {/* User Agent */}
                {selectedLog.user_agent && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 font-mono break-all">
                    <span className="font-bold text-slate-600">User Agent:</span> {selectedLog.user_agent}
                  </div>
                )}

                {/* Payload Snapshot / Changes Comparison */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-theme-primary" />
                      <span>ข้อมูลการเปลี่ยนแปลง (Payload Snapshot)</span>
                    </h4>
                  </div>

                  {/* Both old and new data (Diff) */}
                  {selectedLog.old_data && selectedLog.new_data ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Old Data */}
                      <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                          <span className="font-bold text-rose-700 text-xs">ข้อมูลก่อนหน้า (Old Data)</span>
                          <button
                            onClick={() => handleCopyJSON(selectedLog.old_data, 'old')}
                            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                          >
                            {copiedKey === 'old' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === 'old' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                          </button>
                        </div>
                        <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto max-h-60 p-2 bg-white/70 rounded-lg">
                          {JSON.stringify(selectedLog.old_data, null, 2)}
                        </pre>
                      </div>

                      {/* New Data */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                          <span className="font-bold text-emerald-700 text-xs">ข้อมูลใหม่ (New Data)</span>
                          <button
                            onClick={() => handleCopyJSON(selectedLog.new_data, 'new')}
                            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800"
                          >
                            {copiedKey === 'new' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === 'new' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                          </button>
                        </div>
                        <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto max-h-60 p-2 bg-white/70 rounded-lg">
                          {JSON.stringify(selectedLog.new_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : selectedLog.new_data ? (
                    /* Only New Data */
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-700 text-xs">ข้อมูล Snapshot (New Data)</span>
                        <button
                          onClick={() => handleCopyJSON(selectedLog.new_data, 'single')}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                        >
                          {copiedKey === 'single' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'single' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto max-h-64 p-3 bg-white rounded-lg border border-slate-200/60">
                        {JSON.stringify(selectedLog.new_data, null, 2)}
                      </pre>
                    </div>
                  ) : selectedLog.old_data ? (
                    /* Only Old Data (e.g. Delete) */
                    <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                        <span className="font-bold text-rose-700 text-xs">ข้อมูลก่อนถูกลบ (Deleted Record)</span>
                        <button
                          onClick={() => handleCopyJSON(selectedLog.old_data, 'del')}
                          className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                        >
                          {copiedKey === 'del' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'del' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto max-h-64 p-3 bg-white rounded-lg border border-slate-200/60">
                        {JSON.stringify(selectedLog.old_data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-slate-400 font-medium">
                      ไม่มีการแนบ Payload ข้อมูลเพิ่มเติมในบันทึกนี้
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
