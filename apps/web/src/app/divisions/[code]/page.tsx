'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notification-context';
import { showAlert } from '@/lib/sweetalert';
import {
  Building2,
  BookOpen,
  Users,
  Compass,
  FileText,
  Wallet,
  Eye,
  UserCheck,
  Edit3,
  X,
  Save,
  Check,
  Search,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function DivisionPage() {
  const params = useParams();
  const code = (params?.code as string)?.toUpperCase();
  const { user, token } = useAuth();

  const [division, setDivision] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Deputy Modal
  const [showDeputyModal, setShowDeputyModal] = useState(false);
  const [deputyName, setDeputyName] = useState('');
  const [deputyPosition, setDeputyPosition] = useState('');
  const [savingDeputy, setSavingDeputy] = useState(false);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [budgetTypeFilter, setBudgetTypeFilter] = useState('ALL');

  const fetchDivisionData = () => {
    if (!code) return;
    fetch(`/api/v1/divisions/${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDivision(data.data);
          setDeputyName(data.data.deputy_name || '');
          setDeputyPosition(data.data.deputy_position || `รองผู้อำนวยการ${data.data.name}`);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDivisionData();
  }, [code]);

  // Real-time synchronization
  const { subscribeDataUpdate } = useNotifications();

  useEffect(() => {
    const unsubscribe = subscribeDataUpdate(() => {
      fetchDivisionData();
    });
    return () => unsubscribe();
  }, [subscribeDataUpdate, code]);

  const handleSaveDeputy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showAlert.error('กรุณาเข้าสู่ระบบก่อนดำเนินการ');
      return;
    }

    setSavingDeputy(true);
    try {
      const res = await fetch(`/api/v1/divisions/${code}/deputy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deputy_name: deputyName.trim(),
          deputy_position: deputyPosition.trim(),
        }),
      });

      const result = await res.json();
      if (result.success) {
        showAlert.success('บันทึกข้อมูลรองผู้อำนวยการประจำฝ่ายเรียบร้อยแล้ว');
        setShowDeputyModal(false);
        fetchDivisionData();
      } else {
        showAlert.error(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      showAlert.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSavingDeputy(false);
    }
  };

  const getDivisionIcon = (c: string) => {
    switch (c) {
      case 'ACAD':
        return BookOpen;
      case 'RES':
        return Building2;
      case 'DEV':
        return Users;
      case 'STRAT':
      default:
        return Compass;
    }
  };

  // Helper to resolve project budget type from dynamic_data or fallback
  const getProjectBudgetType = (p: any): { key: string; label: string } => {
    let d: any = {};
    if (p.dynamic_data) {
      if (typeof p.dynamic_data === 'string') {
        try { d = JSON.parse(p.dynamic_data); } catch {}
      } else {
        d = p.dynamic_data;
      }
    }

    if (d.is_act_budget_chk === true || d.is_act_budget === true) {
      return { key: 'ACT', label: 'พ.ร.บ. งบประมาณ' };
    }
    if (d.is_routine_job_chk === true || d.is_routine_job === true) {
      return { key: 'ROUTINE', label: 'ภาระงานปกติ' };
    }
    if (d.is_ovec_policy_chk === true || d.is_ovec_policy === true) {
      return { key: 'OVEC_POLICY', label: 'นโยบาย สอศ.' };
    }
    if (d.is_special_no_budget_chk === true || d.is_special_no_budget === true) {
      return { key: 'SPECIAL_NO_BUDGET', label: 'โครงการพิเศษ ไม่ใช้งบ สอศ.' };
    }

    const bt = String(d.budget_type || '').trim();
    if (bt.includes('พ.ร.บ.') || (bt.includes('งบประมาณ') && !bt.includes('รายได้') && !bt.includes('พิเศษ') && !bt.includes('ไม่ใช้'))) {
      return { key: 'ACT', label: 'พ.ร.บ. งบประมาณ' };
    }
    if (bt.includes('ภาระงาน') || bt.includes('ปกติ')) {
      return { key: 'ROUTINE', label: 'ภาระงานปกติ' };
    }
    if (bt.includes('นโยบาย') || bt.includes('สอศ.')) {
      return { key: 'OVEC_POLICY', label: 'นโยบาย สอศ.' };
    }
    if (bt.includes('ไม่ใช้งบ') || bt.includes('โครงการพิเศษ')) {
      return { key: 'SPECIAL_NO_BUDGET', label: 'โครงการพิเศษ ไม่ใช้งบ สอศ.' };
    }
    if (bt.includes('รายได้')) {
      return { key: 'INCOME', label: 'เงินรายได้สถานศึกษา' };
    }
    if (bt.includes('อุดหนุน')) {
      return { key: 'SUBSIDY', label: 'เงินอุดหนุน' };
    }
    if (bt) {
      return { key: 'OTHER', label: bt };
    }

    return { key: 'UNSPECIFIED', label: 'ไม่ได้ระบุประเภท' };
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full mb-2"></div>
        <p className="text-xs">กำลังโหลดข้อมูลฝ่าย...</p>
      </div>
    );
  }

  if (!division) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>ไม่พบข้อมูลฝ่ายงาน</p>
      </div>
    );
  }

  const Icon = getDivisionIcon(division.code);

  // Aggregate projects directly across all departments in the division
  const allProjects = (division.departments?.flatMap((d: any) =>
    (d.projects || []).map((p: any) => {
      const bType = getProjectBudgetType(p);
      return {
        ...p,
        department: p.department || { id: d.id, name: d.name },
        budgetTypeInfo: bType,
      };
    })
  ) || []).sort((a: any, b: any) => (b.id > a.id ? 1 : -1));

  // Category aggregations (Status)
  const statusStats = {
    ALL: {
      count: allProjects.length,
      budget: allProjects.reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0),
    },
    APPROVED: {
      count: allProjects.filter((p: any) => p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed').length,
      budget: allProjects
        .filter((p: any) => p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed')
        .reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0),
    },
    PENDING: {
      count: allProjects.filter((p: any) => ['submitted', 'dept_approved', 'deputy_approved', 'planning_approved'].includes(p.status)).length,
      budget: allProjects
        .filter((p: any) => ['submitted', 'dept_approved', 'deputy_approved', 'planning_approved'].includes(p.status))
        .reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0),
    },
    REVISION: {
      count: allProjects.filter((p: any) => p.status === 'revision_requested').length,
      budget: allProjects
        .filter((p: any) => p.status === 'revision_requested')
        .reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0),
    },
    REJECT: {
      count: allProjects.filter((p: any) => p.status === 'rejected').length,
      budget: allProjects
        .filter((p: any) => p.status === 'rejected')
        .reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0),
    },
    DRAFT: {
      count: allProjects.filter((p: any) => p.status === 'draft').length,
      budget: allProjects
        .filter((p: any) => p.status === 'draft')
        .reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0),
    },
  };

  // Category aggregations (Budget Types)
  const budgetTypeOptions = [
    { key: 'ALL', label: 'ทุกประเภทงบฯ' },
    { key: 'ACT', label: 'พ.ร.บ. งบประมาณ' },
    { key: 'ROUTINE', label: 'ภาระงานปกติ' },
    { key: 'OVEC_POLICY', label: 'นโยบาย สอศ.' },
    { key: 'SPECIAL_NO_BUDGET', label: 'โครงการพิเศษ ไม่ใช้งบ สอศ.' },
  ];

  const filteredProjects = allProjects.filter((p: any) => {
    const matchSearch =
      !searchQuery.trim() ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.leader?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DRAFT' && p.status === 'draft') ||
      (statusFilter === 'PENDING' && ['submitted', 'dept_approved', 'deputy_approved', 'planning_approved'].includes(p.status)) ||
      (statusFilter === 'APPROVED' && (p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed')) ||
      (statusFilter === 'REVISION' && p.status === 'revision_requested') ||
      (statusFilter === 'REJECT' && p.status === 'rejected');

    const matchBudgetType =
      budgetTypeFilter === 'ALL' ||
      p.budgetTypeInfo?.key === budgetTypeFilter;

    return matchSearch && matchStatus && matchBudgetType;
  });

  const filteredBudget = filteredProjects.reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0);

  const isAdmin = user && user.role === 'ADMIN';

  const filterOptions = [
    { key: 'ALL', label: 'ทั้งหมด', count: statusStats.ALL.count, budget: statusStats.ALL.budget },
    { key: 'APPROVED', label: 'อนุมัติแล้ว', count: statusStats.APPROVED.count, budget: statusStats.APPROVED.budget },
    { key: 'PENDING', label: 'รออนุมัติ', count: statusStats.PENDING.count, budget: statusStats.PENDING.budget },
    { key: 'REVISION', label: 'ขอแก้ไข', count: statusStats.REVISION.count, budget: statusStats.REVISION.budget },
    { key: 'REJECT', label: 'ไม่อนุมัติ', count: statusStats.REJECT.count, budget: statusStats.REJECT.budget },
    { key: 'DRAFT', label: 'แบบร่าง', count: statusStats.DRAFT.count, budget: statusStats.DRAFT.budget },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-theme-gradient text-white rounded-theme p-6 sm:p-7 shadow-lg transition-all duration-300">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-theme bg-white/15 text-white flex items-center justify-center shadow-md shrink-0 border border-white/20 backdrop-blur-sm">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{division.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                  {division.code}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1">
                โครงการทั้งหมดในฝ่าย {allProjects.length} รายการ • รวมงบประมาณเสนอ {statusStats.ALL.budget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </p>
            </div>
          </div>

          {/* Right side: Deputy Director Info & Budget Overview */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Deputy Director Card */}
            <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-theme backdrop-blur-sm">
              <div className="w-9 h-9 rounded-theme bg-white/20 text-white flex items-center justify-center border border-white/20 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold text-white/70">รองผู้อำนวยการประจำฝ่าย</p>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setDeputyName(division.deputy_name || '');
                        setDeputyPosition(division.deputy_position || `รองผู้อำนวยการ${division.name}`);
                        setShowDeputyModal(true);
                      }}
                      className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded transition"
                      title="แก้ไขชื่อรองผู้อำนวยการ"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-bold text-white truncate max-w-[160px]">
                  {division.deputy_name || (
                    <span className="text-white/60 font-normal italic">
                      {isAdmin ? 'ยังไม่ได้ระบุ (คลิกเพื่อแก้ไข)' : 'ยังไม่ได้ระบุชื่อ'}
                    </span>
                  )}
                </p>
                {division.deputy_name && division.deputy_position && (
                  <p className="text-[9px] text-white/70 truncate max-w-[160px]">{division.deputy_position}</p>
                )}
              </div>
            </div>

            {/* Approved Budget Card */}
            <div className="px-3.5 py-2.5 bg-emerald-500/20 border border-emerald-300/30 rounded-theme backdrop-blur-sm text-right">
              <p className="text-[10px] text-emerald-100 font-medium">งบประมาณที่อนุมัติแล้ว</p>
              <p className="text-base sm:text-lg font-bold text-white">
                {statusStats.APPROVED.budget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-emerald-200">บาท</span>
              </p>
            </div>

            {/* Total Proposed Budget Card */}
            <div className="px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-theme backdrop-blur-sm text-right">
              <p className="text-[10px] text-white/70">งบประมาณรวมทั้งฝ่าย</p>
              <p className="text-base sm:text-lg font-bold text-white">
                {statusStats.ALL.budget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-white/70">บาท</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Status Pill Selectors with Budgets */}
      <div className="bg-white p-4 rounded-theme border border-slate-200 shadow-xs space-y-4">
        {/* Top bar: Search + Budget Type dropdown + Filtered total badge */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                aria-label="ค้นหาชื่อโครงการ, รหัส, ผู้รับผิดชอบ"
                placeholder="ค้นหาชื่อโครงการ, รหัส, ผู้รับผิดชอบ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-theme text-xs focus:border-theme-primary outline-none transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Budget Type Filter Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="budgetTypeFilter" className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-theme-primary" />
                <span>ประเภทงบ:</span>
              </label>
              <select
                id="budgetTypeFilter"
                aria-label="ประเภทงบประมาณ"
                value={budgetTypeFilter}
                onChange={(e) => setBudgetTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-xs focus:border-theme-primary outline-none cursor-pointer font-medium text-slate-700"
              >
                {budgetTypeOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filtered Budget Badge */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-theme border border-slate-200 text-xs justify-between shrink-0">
            <span className="text-slate-500 font-medium">
              แสดง {filteredProjects.length} โครงการ | รวมงบฯ ตามตัวกรอง:
            </span>
            <span className="font-bold text-theme-primary text-sm">
              {filteredBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">บาท</span>
            </span>
          </div>
        </div>

        {/* Status Buttons with Counts & Budget Values */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          {filterOptions.map((opt) => {
            const isSelected = statusFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusFilter(opt.key)}
                className={`flex flex-col p-2.5 rounded-theme border text-left transition relative ${
                  isSelected
                    ? 'border-theme-primary bg-theme-primary/5 ring-1 ring-theme-primary shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-theme-primary' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-theme-primary text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {opt.count}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {opt.budget.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{' '}
                  <span className="text-[9px] font-normal">บ.</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects List directly */}
      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-theme border border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">ไม่พบข้อมูลโครงการในฝ่ายนี้</p>
            <p className="text-xs text-slate-400 mt-1">ยังไม่มีการสร้างหรือเสนอโครงการสำหรับฝ่ายงานนี้</p>
          </div>
        ) : (
          filteredProjects.map((p: any) => {
            return (
              <div
                key={p.id}
                className="bg-white rounded-theme border border-slate-200 shadow-xs hover:shadow-md hover:border-theme-primary transition p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.project_code ? (
                      <span className="px-2.5 py-0.5 rounded-theme font-mono font-bold text-xs bg-theme-primary-light text-theme-primary border border-theme-primary/20">
                        {p.project_code}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-theme text-[11px] bg-slate-100 text-slate-500 font-medium">
                        รอออกรหัส
                      </span>
                    )}

                    {p.status === 'draft' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <FileText className="w-3.5 h-3.5" /> แบบร่าง
                      </span>
                    ) : p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว
                      </span>
                    ) : p.status === 'revision_requested' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        <AlertCircle className="w-3.5 h-3.5" /> ขอแก้ไข
                      </span>
                    ) : p.status === 'rejected' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> รออนุมัติ
                      </span>
                    )}

                    {p.fiscal_year && (
                      <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        ปีงบฯ {p.fiscal_year}
                      </span>
                    )}

                    {p.budgetTypeInfo && p.budgetTypeInfo.key !== 'UNSPECIFIED' && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-blue-600" />
                        <span>{p.budgetTypeInfo.label}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    <Link href={`/projects/${p.id}`} className="hover:text-theme-primary transition">
                      {p.title}
                    </Link>
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    {p.department?.name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> {p.department.name}
                      </span>
                    )}
                    {p.leader && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">ผู้รับผิดชอบ:</span> {p.leader.full_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />{' '}
                      <span className="font-semibold text-slate-700">
                        {Number(p.total_budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>{' '}
                      บาท
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link
                    href={`/projects/${p.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-theme-primary-light hover:bg-theme-primary/20 text-theme-primary text-xs font-bold rounded-theme border border-theme-primary/20 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูเอกสารโครงการ</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Deputy Director Modal */}
      {showDeputyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <UserCheck className="w-5 h-5 text-theme-primary" />
                <span>กำหนดผู้ดำรงตำแหน่งรองผู้อำนวยการ</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeputyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeputy} className="p-6 space-y-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-theme text-xs font-bold bg-theme-primary-light text-theme-primary border border-theme-primary/20 mb-2">
                  {division.name} ({division.code})
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล (พร้อมคำนำหน้า) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deputyName}
                  onChange={(e) => setDeputyName(e.target.value)}
                  placeholder="เช่น นายสมศักดิ์ รักเรียน"
                  className="w-full px-3.5 py-2 text-sm rounded-theme border border-slate-300 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตำแหน่งทางการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deputyPosition}
                  onChange={(e) => setDeputyPosition(e.target.value)}
                  placeholder={`เช่น รองผู้อำนวยการ${division.name}`}
                  className="w-full px-3.5 py-2 text-sm rounded-theme border border-slate-300 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeputyModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-theme transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingDeputy}
                  className="px-5 py-2 text-xs font-bold text-white bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 rounded-theme shadow-xs transition flex items-center gap-1.5"
                >
                  {savingDeputy ? (
                    <span>กำลังบันทึก...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>บันทึกข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
