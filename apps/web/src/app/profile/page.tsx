'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import {
  User,
  Mail,
  Building,
  Briefcase,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Settings,
  PlusCircle,
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  Layers,
  FileSignature,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

export default function ProfileDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { collegeName, themePrimaryColor, themeAccentColor } = useSettings();

  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'progress' | 'status'>('overview');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchProfileProjects();
  }, [token]);

  const fetchProfileProjects = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/projects?my_projects=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProjects(data.data);
      } else if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching profile projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'ผู้ดูแลระบบ (Admin)', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'DIRECTOR':
        return { label: 'ผู้อำนวยการสถานศึกษา', bg: 'bg-rose-100 text-rose-900 border-rose-300' };
      case 'PLANNING_OFFICER':
        return { label: 'เจ้าหน้าที่งานวางแผนและงบประมาณ', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'DEPUTY_DIRECTOR':
        return { label: 'รองผู้อำนวยการสถานศึกษา', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'HEAD_DEPT':
        return { label: 'หัวหน้าแผนกวิชา / หัวหน้างาน', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'TEACHER':
      default:
        return { label: 'ครูผู้สอน / ผู้เสนอโครงการ', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'อนุมัติแล้ว',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
        };
      case 'WAITING_HEAD_DEPT':
      case 'PENDING_HEAD_DEPT':
        return {
          label: 'รอหัวหน้าแผนก/งาน',
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          icon: Clock,
        };
      case 'WAITING_PLANNING':
      case 'PENDING_PLANNING':
        return {
          label: 'รองานแผนงานฯ',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: Clock,
        };
      case 'WAITING_DEPUTY':
      case 'PENDING_DEPUTY':
        return {
          label: 'รอรองผู้อำนวยการ',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          icon: Clock,
        };
      case 'WAITING_DIRECTOR':
      case 'PENDING_DIRECTOR':
        return {
          label: 'รอผู้อำนวยการอนุมัติ',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: Clock,
        };
      case 'RETURNED':
      case 'REVISION':
        return {
          label: 'ส่งกลับแก้ไข',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: RotateCcw,
        };
      case 'REJECTED':
        return {
          label: 'ไม่อนุมัติ',
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500',
          icon: XCircle,
        };
      case 'DRAFT':
      default:
        return {
          label: 'แบบร่าง (Draft)',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: FileText,
        };
    }
  };

  const getProgressSteps = (status: string) => {
    const steps = [
      { id: 1, name: 'เสนอโครงการ (แผนก/งาน)', key: 'DEPT' },
      { id: 2, name: 'ตรวจสอบงบ & รหัส (งานแผนงาน)', key: 'PLANNING' },
      { id: 3, name: 'พิจารณา (รอง ผอ.)', key: 'DEPUTY' },
      { id: 4, name: 'อนุมัติโครงการ (ผอ.)', key: 'DIRECTOR' },
    ];

    let currentStep = 0;
    let isApproved = false;
    let isReturned = false;

    if (status === 'DRAFT') {
      currentStep = 0;
    } else if (status === 'WAITING_HEAD_DEPT' || status === 'PENDING_HEAD_DEPT') {
      currentStep = 1;
    } else if (status === 'WAITING_PLANNING' || status === 'PENDING_PLANNING') {
      currentStep = 2;
    } else if (status === 'WAITING_DEPUTY' || status === 'PENDING_DEPUTY') {
      currentStep = 3;
    } else if (status === 'WAITING_DIRECTOR' || status === 'PENDING_DIRECTOR') {
      currentStep = 4;
    } else if (status === 'APPROVED') {
      currentStep = 5;
      isApproved = true;
    } else if (status === 'RETURNED' || status === 'REVISION') {
      isReturned = true;
    }

    return { steps, currentStep, isApproved, isReturned };
  };

  // Metrics calculation
  const totalProjects = projects.length;
  const approvedProjects = projects.filter((p) => p.status === 'APPROVED').length;
  const pendingProjects = projects.filter((p) => p.status && (p.status.startsWith('WAITING') || p.status.startsWith('PENDING'))).length;
  const draftOrRevisionProjects = projects.filter((p) => p.status === 'DRAFT' || p.status === 'RETURNED' || p.status === 'REVISION').length;
  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.total_budget) || Number(p.budget) || 0), 0);
  const approvalRate = totalProjects > 0 ? Math.round((approvedProjects / totalProjects) * 100) : 0;

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      (p.name_th || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.project_code || '').toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'ALL') return matchSearch;
    if (statusFilter === 'APPROVED') return matchSearch && p.status === 'APPROVED';
    if (statusFilter === 'PENDING') return matchSearch && (p.status?.startsWith('WAITING') || p.status?.startsWith('PENDING'));
    if (statusFilter === 'DRAFT') return matchSearch && (p.status === 'DRAFT' || p.status === 'RETURNED' || p.status === 'REVISION');
    return matchSearch;
  });

  const roleInfo = getRoleBadge(user?.role);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* 1. Header Profile Banner Styled with System Theme */}
      <div className="relative overflow-hidden bg-theme-gradient text-white rounded-theme p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* User Profile Details */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-theme object-cover border-2 border-white/30 shadow-md ring-4 ring-white/10"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-20 h-20 rounded-theme bg-white/20 text-white flex items-center justify-center font-bold text-3xl shadow-md border-2 border-white/30 ring-4 ring-white/10 backdrop-blur-sm ${
                  user?.avatar_url ? 'hidden' : ''
                }`}
              >
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user?.full_name || user?.username}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/20 backdrop-blur-sm">
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-white/80" />
                  {user?.email || 'ยังไม่ได้ระบุอีเมล'}
                </span>
                {user?.position && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-white font-medium">{user.position}</span>
                  </>
                )}
                {user?.department?.name && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-white/95 font-medium underline underline-offset-2">{user.department.name}</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-white/70">
                สังกัดสถานศึกษา: <span className="text-white font-medium">{collegeName}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-end">
            <Link
              href="/profile/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 active:scale-95 rounded-theme transition shadow-md"
            >
              <Settings className="w-4 h-4 text-theme-primary" />
              <span>ตั้งค่าโปรไฟล์ & ลายเซ็น</span>
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-theme-accent hover:brightness-110 active:scale-95 rounded-theme transition shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เสนอโครงการใหม่</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/dashboard');
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-theme transition border border-white/15 backdrop-blur-sm"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">ย้อนกลับ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics & KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">โครงการทั้งหมด</span>
            <div className="p-2 rounded-theme bg-theme-primary-light text-theme-primary">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalProjects}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">โครงการที่คุณเป็นผู้รับผิดชอบ</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">อนุมัติแล้ว</span>
            <div className="p-2 rounded-theme bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{approvedProjects}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">คิดเป็น {approvalRate}% ของทั้งหมด</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">อยู่ระหว่างรออนุมัติ</span>
            <div className="p-2 rounded-theme bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingProjects}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">กำลังอยู่ในขั้นตอนการพิจารณา</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">แบบร่าง / ส่งกลับแก้ไข</span>
            <div className="p-2 rounded-theme bg-rose-50 text-rose-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{draftOrRevisionProjects}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">รอการปรับปรุงหรือส่งเสนอ</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-theme-gradient text-white p-4 sm:p-5 rounded-theme shadow-sm">
          <div className="flex items-center justify-between text-white/90 mb-2">
            <span className="text-xs font-bold">งบประมาณรวม</span>
            <div className="p-2 rounded-theme bg-white/20 text-white backdrop-blur-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black truncate">฿{totalBudget.toLocaleString()}</p>
          <p className="text-[11px] text-white/80 mt-0.5">รวมทุกโครงการของคุณ</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 backdrop-blur-sm rounded-theme border border-slate-200/80 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeTab === 'overview' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>ภาพรวมโปรไฟล์ & กิจกรรม</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'projects'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'projects' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>โครงการของฉัน ({projects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'progress'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className={`w-4 h-4 ${activeTab === 'progress' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>ความคืบหน้าโครงการ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'status'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Layers className={`w-4 h-4 ${activeTab === 'status' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>สถานะโครงการ</span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Projects & Visual Progress */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-theme border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <Sparkles className="w-4 h-4 text-theme-primary" />
                  <span>โครงการล่าสุดของฉัน</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1"
                >
                  <span>ดูทั้งหมด ({projects.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">กำลังโหลดข้อมูลโครงการ...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-slate-600">ยังไม่มีรายการโครงการ</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">เริ่มต้นสร้างข้อเสนอโครงการแรกของคุณ</p>
                  <Link
                    href="/projects/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-theme shadow-xs transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>สร้างโครงการใหม่</span>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {projects.slice(0, 5).map((p) => {
                    const statusInfo = getStatusBadge(p.status);
                    return (
                      <div key={p.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group">
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            {p.project_code && (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-theme-primary-light text-theme-primary">
                                {p.project_code}
                              </span>
                            )}
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-theme-primary transition">
                              <Link href={`/projects/${p.id}`}>{p.name_th}</Link>
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>งบประมาณ: ฿{(Number(p.total_budget) || Number(p.budget) || 0).toLocaleString()}</span>
                            <span>•</span>
                            <span>ปีงบประมาณ {p.fiscal_year || '-'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>
                          <Link
                            href={`/projects/${p.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-theme-primary hover:bg-theme-primary-light transition"
                            title="เปิดดูโครงการ"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Status Distribution */}
            <div className="bg-white p-6 rounded-theme border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-theme-primary" />
                <span>สัดส่วนสถานะโครงการ</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-700">อนุมัติเรียบร้อย</span>
                    <span className="text-slate-600">{approvedProjects} / {totalProjects} ({approvalRate}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${approvalRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-700">รอการพิจารณา / รออนุมัติ</span>
                    <span className="text-slate-600">
                      {pendingProjects} / {totalProjects} ({totalProjects > 0 ? Math.round((pendingProjects / totalProjects) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalProjects > 0 ? (pendingProjects / totalProjects) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-700">แบบร่าง / ส่งกลับแก้ไข</span>
                    <span className="text-slate-600">
                      {draftOrRevisionProjects} / {totalProjects} ({totalProjects > 0 ? Math.round((draftOrRevisionProjects / totalProjects) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalProjects > 0 ? (draftOrRevisionProjects / totalProjects) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Personal Account Card & Signature Preview */}
          <div className="space-y-6">
            {/* Account Card */}
            <div className="bg-white p-6 rounded-theme border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-theme-primary" />
                  <span>ข้อมูลบัญชีผู้ใช้งาน</span>
                </span>
                <Link
                  href="/profile/settings"
                  className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </Link>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">ชื่อ-นามสกุล</span>
                  <p className="font-bold text-slate-800">{user?.full_name || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">ตำแหน่งทางการ</span>
                  <p className="font-semibold text-slate-700">{user?.position || 'ยังไม่ระบุ'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">แผนกวิชา / ฝ่ายงาน</span>
                  <p className="font-semibold text-slate-700">{user?.department?.name || 'ยังไม่ระบุ'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">ชื่อผู้ใช้งาน (Username)</span>
                  <p className="font-mono font-semibold text-slate-700">{user?.username}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">บทบาทระบบ (Role)</span>
                  <p className="font-semibold text-theme-primary">{roleInfo.label}</p>
                </div>
              </div>
            </div>

            {/* Digital Signature Card */}
            <div className="bg-white p-6 rounded-theme border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-emerald-600" />
                  <span>ลายเซ็นดิจิทัล</span>
                </span>
                <Link
                  href="/profile/settings"
                  className="text-xs font-bold text-theme-primary hover:underline"
                >
                  ตั้งค่าลายเซ็น
                </Link>
              </div>

              <div className="p-4 bg-slate-50 rounded-theme border border-slate-100 flex items-center justify-center min-h-[100px]">
                {user?.signature_img ? (
                  <div className="text-center space-y-1">
                    <img
                      src={user.signature_img}
                      alt="Signature"
                      className="max-h-16 max-w-full object-contain mx-auto filter drop-shadow-xs"
                    />
                    <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      พร้อมแนบในเอกสาร
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs">
                    <FileSignature className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>ยังไม่มีลายเซ็นในระบบ</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                ลายเซ็นนี้จะถูกประทับอัตโนมัติในส่วนท้ายของโครงการและรายงานสรุป
              </p>
            </div>

            {/* Settings Jump Banner Styled with System Gradient */}
            <div className="bg-theme-gradient p-5 rounded-theme text-white space-y-3 shadow-md">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-white" />
                <h4 className="font-bold text-xs">การตั้งค่าโปรไฟล์และรหัสผ่าน</h4>
              </div>
              <p className="text-[11px] text-white/80 leading-relaxed">
                คุณสามารถปรับเปลี่ยนรูปโปรไฟล์, วาดลายเซ็นดิจิทัล, เปลี่ยนชื่อ-สังกัด และเปลี่ยนรหัสผ่านได้ที่หน้าการตั้งค่า
              </p>
              <Link
                href="/profile/settings"
                className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-theme transition shadow-xs"
              >
                <span>ไปยังหน้า Profile Settings</span>
                <ChevronRight className="w-4 h-4 text-theme-primary" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY PROJECTS (โครงการของฉัน) */}
      {activeTab === 'projects' && (
        <div className="bg-white p-6 sm:p-7 rounded-theme border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-base">รายการโครงการของฉัน</h2>
              <p className="text-xs text-slate-500">โครงการทั้งหมดที่คุณเป็นผู้รับผิดชอบและได้จัดทำในระบบ</p>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือ รหัสโครงการ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-theme text-xs outline-none focus:border-theme-primary w-52 sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-theme text-xs font-semibold outline-none focus:border-theme-primary bg-white text-slate-700"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="PENDING">รอพิจารณา</option>
                <option value="DRAFT">แบบร่าง/ส่งกลับแก้ไข</option>
              </select>

              <Link
                href="/projects/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-theme shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>สร้างโครงการ</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">กำลังโหลดโครงการของฉัน...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-slate-600">ไม่พบรายการโครงการที่ตรงตามเงื่อนไข</p>
              <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">รหัสโครงการ</th>
                    <th className="py-3 px-4">ชื่อโครงการ</th>
                    <th className="py-3 px-4">ปีงบประมาณ</th>
                    <th className="py-3 px-4 text-right">งบประมาณ</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-center">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((p) => {
                    const statusInfo = getStatusBadge(p.status);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {p.project_code || <span className="text-slate-400 font-normal italic">รอออกรหัส</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-bold text-slate-900 hover:text-theme-primary transition line-clamp-2"
                          >
                            {p.name_th}
                          </Link>
                          {p.name_en && <p className="text-[10px] text-slate-400 line-clamp-1">{p.name_en}</p>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {p.fiscal_year || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                          ฿{(Number(p.total_budget) || Number(p.budget) || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/projects/${p.id}`}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-theme transition"
                            >
                              ดูเอกสาร
                            </Link>
                            {(p.status === 'DRAFT' || p.status === 'RETURNED' || p.status === 'REVISION') && (
                              <Link
                                href={`/projects/${p.id}/edit`}
                                className="px-2.5 py-1 text-[11px] font-bold text-theme-primary bg-theme-primary-light hover:brightness-95 rounded-theme transition"
                              >
                                แก้ไข
                              </Link>
                            )}
                            {p.status === 'APPROVED' && (
                              <Link
                                href={`/projects/${p.id}/summary`}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-theme transition"
                              >
                                สรุปผล
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROJECT PROGRESS (ความคืบหน้าโครงการ) */}
      {activeTab === 'progress' && (
        <div className="bg-white p-6 sm:p-7 rounded-theme border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-base">ความคืบหน้าการพิจารณาและอนุมัติโครงการ</h2>
              <p className="text-xs text-slate-500">ติดตามขั้นตอนการลงนามตามลำดับสายบังคับบัญชา 4 ลำดับขั้น</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">กำลังโหลดความคืบหน้า...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <TrendingUp className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-slate-600">ยังไม่มีข้อมูลความคืบหน้าโครงการ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((p) => {
                const statusInfo = getStatusBadge(p.status);
                const { steps, currentStep, isApproved, isReturned } = getProgressSteps(p.status);

                return (
                  <div key={p.id} className="p-5 rounded-theme border border-slate-200 hover:border-slate-300 transition bg-slate-50/40 hover:bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {p.project_code && (
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-theme-primary-light text-theme-primary">
                              {p.project_code}
                            </span>
                          )}
                          <h4 className="font-bold text-sm text-slate-900">
                            <Link href={`/projects/${p.id}`} className="hover:text-theme-primary transition">
                              {p.name_th}
                            </Link>
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500">
                          งบประมาณ: <strong className="text-slate-700">฿{(Number(p.total_budget) || Number(p.budget) || 0).toLocaleString()}</strong> • ประจำปีงบประมาณ {p.fiscal_year || '-'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                        <Link
                          href={`/projects/${p.id}`}
                          className="p-2 text-slate-500 hover:text-theme-primary bg-white border border-slate-200 rounded-theme transition shadow-2xs"
                          title="เปิดดูโครงการ"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Step Visual Stepper */}
                    <div className="pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {steps.map((s) => {
                          const isDone = isApproved || currentStep > s.id;
                          const isCurrent = !isApproved && currentStep === s.id;

                          return (
                            <div
                              key={s.id}
                              className={`p-3 rounded-theme border transition text-xs flex items-center gap-2.5 ${
                                isDone
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                  : isCurrent
                                  ? isReturned
                                    ? 'bg-rose-50 border-rose-200 text-rose-900 ring-2 ring-rose-200'
                                    : 'bg-theme-primary-light border-theme-primary/30 text-slate-900 ring-2 ring-theme-primary/20'
                                  : 'bg-white border-slate-200 text-slate-400 opacity-60'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : isCurrent
                                    ? isReturned
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-theme-primary text-white animate-pulse'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isDone ? '✓' : s.id}
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-bold text-[11px] truncate leading-tight">{s.name}</p>
                                <p className="text-[9px] truncate opacity-75">
                                  {isDone ? 'ผ่านการพิจารณา' : isCurrent ? (isReturned ? 'ส่งกลับแก้ไข' : 'กำลังดำเนินการ') : 'รอดำเนินการ'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROJECT STATUS (สถานะโครงการ) */}
      {activeTab === 'status' && (
        <div className="bg-white p-6 sm:p-7 rounded-theme border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h2 className="font-black text-slate-900 text-base">การจัดกลุ่มตามสถานะโครงการ</h2>
            <p className="text-xs text-slate-500">สรุปความพร้อมและสถานะการดำเนินงานของแต่ละโครงการ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* 1. Approved Column */}
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-theme flex items-center justify-between text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-xs">อนุมัติเสร็จสิ้น</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs">
                  {approvedProjects}
                </span>
              </div>

              <div className="space-y-2">
                {projects
                  .filter((p) => p.status === 'APPROVED')
                  .map((p) => (
                    <div key={p.id} className="p-3.5 bg-white rounded-theme border border-slate-200 hover:border-emerald-300 shadow-2xs space-y-2 transition group">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/projects/${p.id}`} className="font-bold text-xs text-slate-900 group-hover:text-theme-primary line-clamp-2">
                          {p.name_th}
                        </Link>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>{p.project_code || 'มีรหัสโครงการแล้ว'}</span>
                        <span className="font-bold text-emerald-700">฿{(Number(p.total_budget) || Number(p.budget) || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                {approvedProjects === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">ยังไม่มีโครงการที่อนุมัติ</p>
                )}
              </div>
            </div>

            {/* 2. In Review / Pending Column */}
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-theme flex items-center justify-between text-amber-950">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-xs">อยู่ระหว่างรออนุมัติ</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                  {pendingProjects}
                </span>
              </div>

              <div className="space-y-2">
                {projects
                  .filter((p) => p.status?.startsWith('WAITING') || p.status?.startsWith('PENDING'))
                  .map((p) => (
                    <div key={p.id} className="p-3.5 bg-white rounded-theme border border-slate-200 hover:border-amber-300 shadow-2xs space-y-2 transition group">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/projects/${p.id}`} className="font-bold text-xs text-slate-900 group-hover:text-theme-primary line-clamp-2">
                          {p.name_th}
                        </Link>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="text-amber-700 font-medium">กำลังพิจารณา</span>
                        <span className="font-bold text-slate-700">฿{(Number(p.total_budget) || Number(p.budget) || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                {pendingProjects === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">ไม่มีโครงการที่รอดำเนินการ</p>
                )}
              </div>
            </div>

            {/* 3. Draft / Revision Column */}
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-theme flex items-center justify-between text-slate-900">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <span className="font-bold text-xs">แบบร่าง / ส่งกลับแก้ไข</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">
                  {draftOrRevisionProjects}
                </span>
              </div>

              <div className="space-y-2">
                {projects
                  .filter((p) => p.status === 'DRAFT' || p.status === 'RETURNED' || p.status === 'REVISION')
                  .map((p) => (
                    <div key={p.id} className="p-3.5 bg-white rounded-theme border border-slate-200 hover:border-rose-300 shadow-2xs space-y-2 transition group">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/projects/${p.id}`} className="font-bold text-xs text-slate-900 group-hover:text-theme-primary line-clamp-2">
                          {p.name_th}
                        </Link>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className={p.status === 'RETURNED' || p.status === 'REVISION' ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                          {p.status === 'RETURNED' || p.status === 'REVISION' ? 'ส่งกลับแก้ไข' : 'แบบร่าง'}
                        </span>
                        <Link
                          href={`/projects/${p.id}/edit`}
                          className="text-theme-primary font-bold hover:underline"
                        >
                          แก้ไขข้อมูล
                        </Link>
                      </div>
                    </div>
                  ))}
                {draftOrRevisionProjects === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">ไม่มีโครงการที่เป็นแบบร่าง</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
