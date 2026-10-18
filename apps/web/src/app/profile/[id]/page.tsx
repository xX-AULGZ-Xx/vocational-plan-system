'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import {
  User as UserIcon,
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
  ArrowLeft,
  Settings,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  Layers,
  BarChart3,
  TrendingUp,
  FileSignature
} from 'lucide-react';

export default function UserProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, token } = useAuth();
  const { collegeName } = useSettings();

  const userId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'status'>('overview');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isSelf, setIsSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (userId && token) {
      fetchUserProfile();
    }
  }, [userId, token]);

  const fetchUserProfile = async () => {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/auth/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTargetUser(data.data.user);
        setStats(data.data.stats);
        setProjects(data.data.projects || []);
        setIsSelf(Boolean(data.data.is_self));
      } else {
        setError(data.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ของผู้ใช้นี้ได้');
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
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
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'APPROVED':
        return {
          label: 'อนุมัติแล้ว',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
        };
      case 'IN_PROGRESS':
        return {
          label: 'กำลังดำเนินการ',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          icon: Clock,
        };
      case 'COMPLETED':
        return {
          label: 'เสร็จสิ้นแล้ว',
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          dot: 'bg-teal-500',
          icon: CheckCircle2,
        };
      case 'WAITING_HEAD_DEPT':
      case 'PENDING_HEAD_DEPT':
        return {
          label: 'รอ หน.แผนก เห็นชอบ',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: Clock,
        };
      case 'WAITING_PLANNING':
      case 'PENDING_PLANNING':
        return {
          label: 'รองานแผนงานตรวจสอบ',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: Clock,
        };
      case 'WAITING_DEPUTY':
      case 'PENDING_DEPUTY':
        return {
          label: 'รอ รอง ผอ. พิจารณา',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          icon: Clock,
        };
      case 'WAITING_DIRECTOR':
      case 'PENDING_DIRECTOR':
        return {
          label: 'รอ ผอ. อนุมัติ',
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          dot: 'bg-orange-500',
          icon: Clock,
        };
      case 'SUBMITTED':
      case 'ENDORSED':
        return {
          label: 'เสนอโครงการแล้ว',
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          icon: Clock,
        };
      case 'REJECTED':
      case 'DISAPPROVED':
        return {
          label: 'ไม่อนุมัติ',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: XCircle,
        };
      case 'REVISION_REQUESTED':
      case 'RETURNED':
      case 'REVISION':
        return {
          label: 'ส่งกลับแก้ไข',
          bg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
          dot: 'bg-yellow-500',
          icon: AlertCircle,
        };
      case 'DRAFT':
        return {
          label: 'ฉบับร่าง',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: FileText,
        };
      default:
        return {
          label: status || 'ไม่ทราบสถานะ',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: FileText,
        };
    }
  };

  const filteredProjects = projects.filter((p) => {
    const title = p.title || p.name_th || '';
    const code = p.project_code || '';
    const matchSearch =
      title.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase());

    const statusUpper = (p.status || '').toUpperCase();
    if (statusFilter === 'ALL') return matchSearch;
    if (statusFilter === 'APPROVED') return matchSearch && statusUpper === 'APPROVED';
    if (statusFilter === 'IN_PROGRESS') return matchSearch && (statusUpper === 'IN_PROGRESS' || statusUpper === 'COMPLETED');
    if (statusFilter === 'PENDING') return matchSearch && (statusUpper.startsWith('WAIT') || statusUpper.startsWith('PEND') || statusUpper === 'SUBMITTED' || statusUpper === 'ENDORSED');
    if (statusFilter === 'DRAFT') return matchSearch && (statusUpper === 'DRAFT' || statusUpper === 'REVISION_REQUESTED');
    return matchSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-pulse">
        <div className="h-44 bg-slate-200 rounded-theme" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 rounded-theme" />
          <div className="h-24 bg-slate-200 rounded-theme" />
          <div className="h-24 bg-slate-200 rounded-theme" />
          <div className="h-24 bg-slate-200 rounded-theme" />
        </div>
        <div className="h-96 bg-slate-100 rounded-theme" />
      </div>
    );
  }

  if (error || !targetUser) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้งาน</h2>
          <p className="text-sm text-slate-500">{error || 'ผู้ใช้งานนี้อาจถูกลบหรือไม่มีอยู่ในระบบ'}</p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-theme bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับ</span>
          </button>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleBadge(targetUser.role);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* 1. Header Profile Banner Styled with System Theme */}
      <div className="relative overflow-hidden bg-theme-gradient text-white rounded-theme p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* User Profile Details */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {targetUser.avatar_url ? (
                <img
                  src={targetUser.avatar_url}
                  alt={targetUser.full_name}
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
                  targetUser.avatar_url ? 'hidden' : ''
                }`}
              >
                {targetUser.full_name?.charAt(0) || 'U'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {targetUser.full_name || targetUser.username}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/20 backdrop-blur-sm">
                  {roleInfo.label}
                </span>
                {isSelf && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-emerald-950 shadow-xs">
                    บัญชีของคุณ
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-y-1.5 gap-x-2">
                {targetUser.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-white/80" />
                    <a href={`mailto:${targetUser.email}`} className="hover:underline">
                      {targetUser.email}
                    </a>
                  </span>
                )}
                {targetUser.position && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-white font-medium">{targetUser.position}</span>
                  </>
                )}
                {targetUser.department?.name && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-white/95 font-medium underline underline-offset-2">
                      {targetUser.department.name}
                    </span>
                  </>
                )}
                {targetUser.department?.division?.name && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-white/80 text-xs">
                      ({targetUser.department.division.name})
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-white/70">
                สังกัดสถานศึกษา: <span className="text-white font-medium">{collegeName}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-end">
            {isSelf ? (
              <>
                <Link
                  href="/profile/settings"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 active:scale-95 rounded-theme transition shadow-md"
                >
                  <Settings className="w-4 h-4 text-theme-primary" />
                  <span>ตั้งค่าโปรไฟล์</span>
                </Link>
                <Link
                  href="/projects/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-theme-accent hover:brightness-110 active:scale-95 rounded-theme transition shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>เสนอโครงการใหม่</span>
                </Link>
              </>
            ) : targetUser.email ? (
              <a
                href={`mailto:${targetUser.email}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 active:scale-95 rounded-theme transition shadow-md"
              >
                <Mail className="w-4 h-4 text-theme-primary" />
                <span>ติดต่อทางอีเมล</span>
              </a>
            ) : null}

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">โครงการทั้งหมด</span>
            <div className="p-2 rounded-theme bg-theme-primary-light text-theme-primary">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.total_projects || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">โครงการ</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">อนุมัติแล้ว</span>
            <div className="p-2 rounded-theme bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">
              {stats?.approved_projects || 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              ({stats?.total_projects > 0 ? Math.round(((stats.approved_projects || 0) / stats.total_projects) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">รอดำเนินการ/พิจารณา</span>
            <div className="p-2 rounded-theme bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">
              {stats?.pending_projects || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">โครงการ</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-theme border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">งบประมาณรวมที่เสนอ</span>
            <div className="p-2 rounded-theme bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 truncate">
            <span className="text-xl sm:text-2xl font-black text-slate-900 truncate">
              {Number(stats?.total_budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 font-medium shrink-0">บาท</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-theme transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-theme-primary text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ภาพรวมผลงาน</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 text-xs font-bold rounded-theme transition flex items-center gap-2 ${
            activeTab === 'projects'
              ? 'bg-theme-primary text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>รายการโครงการ ({projects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`px-4 py-2 text-xs font-bold rounded-theme transition flex items-center gap-2 ${
            activeTab === 'status'
              ? 'bg-theme-primary text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>สถานะการพิจารณา</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Profile Summary Card */}
          <div className="bg-white rounded-theme p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-theme-primary" />
              <span>ข้อมูลบทบาทและสังกัด</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-1">ตำแหน่งงาน</span>
                <span className="font-bold text-slate-800">{targetUser.position || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-1">แผนกวิชา/งาน</span>
                <span className="font-bold text-slate-800">{targetUser.department?.name || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-1">ฝ่ายงาน</span>
                <span className="font-bold text-slate-800">{targetUser.department?.division?.name || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-1">สิทธิ์ในระบบ</span>
                <span className="font-bold text-slate-800">{roleInfo.label}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-1">อีเมลติดต่อ</span>
                <span className="font-bold text-slate-800 truncate block">{targetUser.email || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-1">วันที่สร้างบัญชี</span>
                <span className="font-bold text-slate-800">
                  {targetUser.created_at ? new Date(targetUser.created_at).toLocaleDateString('th-TH') : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent 5 Projects */}
          <div className="bg-white rounded-theme p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-theme-primary" />
                <span>โครงการล่าสุด</span>
              </h3>
              {projects.length > 5 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1"
                >
                  <span>ดูทั้งหมด ({projects.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ยังไม่มีข้อมูลโครงการที่เสนอ
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projects.slice(0, 5).map((project) => {
                  const badge = getStatusBadge(project.status);
                  const Icon = badge.icon;
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-semibold text-slate-500">
                            {project.project_code || 'PRJ-DRAFT'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            <Icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-theme-primary transition">
                          {project.title || project.name_th}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                          <span>ปีงบประมาณ: {project.fiscal_year}</span>
                          <span>•</span>
                          <span>งบประมาณ: {Number(project.total_budget || 0).toLocaleString('th-TH')} บาท</span>
                        </div>
                      </div>

                      <div className="text-slate-400 group-hover:text-slate-600 transition shrink-0">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-theme p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อหรือรหัสโครงการ..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { key: 'ALL', label: 'ทั้งหมด' },
                { key: 'APPROVED', label: 'อนุมัติแล้ว' },
                { key: 'IN_PROGRESS', label: 'ดำเนินงาน' },
                { key: 'PENDING', label: 'รอพิจารณา' },
                ...(isSelf ? [{ key: 'DRAFT', label: 'ฉบับร่าง' }] : []),
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                    statusFilter === f.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project List */}
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-theme p-12 text-center text-slate-400 text-xs border border-slate-200">
              ไม่พบโครงการตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => {
                const badge = getStatusBadge(project.status);
                const Icon = badge.icon;
                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-theme p-5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {project.project_code || 'PRJ-DRAFT'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {project.title || project.name_th}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {project.background || 'ไม่มีข้อมูลรายละเอียดโครงการ'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">งบประมาณ</span>
                        <span className="font-bold text-slate-900">
                          {Number(project.total_budget || 0).toLocaleString('th-TH')} บาท
                        </span>
                      </div>
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-theme-primary bg-theme-primary-light hover:bg-theme-primary hover:text-white transition"
                      >
                        <span>ดูรายละเอียด</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'status' && (
        <div className="bg-white rounded-theme p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-theme-primary" />
            <span>สถานะและกระบวนการพิจารณาโครงการ</span>
          </h3>

          {projects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              ยังไม่มีโครงการในระบบ
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.map((project) => {
                const badge = getStatusBadge(project.status);
                const Icon = badge.icon;
                return (
                  <div key={project.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {project.project_code || 'PRJ-DRAFT'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            <Icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          {project.title || project.name_th}
                        </h4>
                      </div>

                      <Link
                        href={`/projects/${project.id}`}
                        className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 self-start sm:self-auto shrink-0"
                      >
                        <span>เปิดโครงการ</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Step progress pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className={`p-2 rounded-lg border text-center font-medium ${
                        ['submitted', 'endorsed', 'approved', 'in_progress', 'completed'].includes(project.status)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        1. เสนอโครงการ
                      </div>
                      <div className={`p-2 rounded-lg border text-center font-medium ${
                        ['endorsed', 'approved', 'in_progress', 'completed'].includes(project.status)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : project.status === 'submitted'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        2. ตรวจสอบงบ/รหัส
                      </div>
                      <div className={`p-2 rounded-lg border text-center font-medium ${
                        ['approved', 'in_progress', 'completed'].includes(project.status)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : project.status === 'endorsed'
                          ? 'bg-purple-50 border-purple-200 text-purple-800'
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        3. พิจารณา/เห็นชอบ
                      </div>
                      <div className={`p-2 rounded-lg border text-center font-medium ${
                        ['approved', 'in_progress', 'completed'].includes(project.status)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        4. อนุมัติโครงการ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
