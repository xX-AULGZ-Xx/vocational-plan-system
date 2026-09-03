'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import {
  Wallet,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Filter,
  Eye,
  Download,
  Building,
  PlusCircle,
  AlertCircle,
  BarChart3,
  PieChart,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { collegeName } = useSettings();

  const [fiscalYear, setFiscalYear] = useState<number>(2569);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [fiscalYear, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const statsRes = await fetch(`/api/v1/budgets/dashboard-stats?fiscal_year=${fiscalYear}`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      const projectsRes = await fetch(`/api/v1/projects?fiscal_year=${fiscalYear}`, { headers });
      const projectsData = await projectsRes.json();
      if (projectsData.success) {
        setProjects(projectsData.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">อนุมัติแล้ว</span>;
      case 'submitted':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">รอหัวหน้าแผนกพิจารณา</span>;
      case 'dept_approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">รอรอง ผอ. พิจารณา</span>;
      case 'deputy_approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">รองานแผนออกรหัส</span>;
      case 'planning_approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">รอ ผอ. อนุมัติ</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">ไม่อนุมัติ</span>;
      case 'draft':
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">แบบร่าง (Draft)</span>;
    }
  };

  const filteredProjects = projects.filter((p) => {
    // Exclude draft projects from dashboard
    if (p.status === 'draft') return false;
    if (selectedStatus && p.status !== selectedStatus) return false;
    if (selectedDivision && p.department?.division?.code?.toLowerCase() !== selectedDivision.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchCode = p.project_code?.toLowerCase().includes(q);
      const matchLeader = p.leader?.full_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchLeader) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-theme-gradient text-white p-6 sm:p-7 rounded-theme shadow-lg transition-all duration-300">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-medium backdrop-blur-sm">
            <span>{collegeName}</span>
            <span>•</span>
            <span>ปีงบประมาณ พ.ศ. {fiscalYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">ระบบติดตามแผนปฏิบัติราชการและงบประมาณ</h1>
          <p className="text-xs sm:text-sm text-white/80">
            ควบคุมสายงานอนุมัติดิจิทัล ตรวจสอบงบประมาณ 4 ฝ่ายบริหาร และจัดทำเอกสารราชการอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(parseInt(e.target.value))}
            className="px-3 py-2 text-xs sm:text-sm bg-white/15 hover:bg-white/25 border border-white/20 rounded-theme text-white font-medium outline-none backdrop-blur-sm cursor-pointer"
          >
            <option value={2569} className="text-slate-900">ปีงบประมาณ 2569</option>
            <option value={2568} className="text-slate-900">ปีงบประมาณ 2568</option>
          </select>

          {user ? (
            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-theme bg-theme-accent hover:brightness-110 text-white shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เสนอโครงการใหม่</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-theme bg-white text-slate-900 hover:bg-slate-100 shadow-md transition"
            >
              <span>เข้าสู่ระบบสถานศึกษา</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allocated */}
        <div className="bg-white p-5 rounded-theme border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">งบประมาณรวมตามแผน</p>
            <h2 className="text-2xl font-bold text-slate-900 font-mono">
              {stats?.metrics?.total_allocated?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}
            </h2>
            <p className="text-xs text-slate-400">
              บาท {stats?.metrics?.approved_budget > 0 ? '(อนุมัติแล้ว)' : '(เสนอขออนุมัติ)'} • {stats?.total_projects || 0} โครงการ
            </p>
          </div>
          <div className="p-3 bg-theme-primary-light text-theme-primary rounded-theme">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Actual Spent */}
        <div className="bg-white p-5 rounded-theme border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">งบประมาณที่ใช้จริง</p>
            <h2 className="text-2xl font-bold text-emerald-600 font-mono">
              {stats?.metrics?.actual_spent?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}
            </h2>
            <p className="text-xs text-emerald-700/80">เบิกจ่ายตามรายงานสรุป</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-theme">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="bg-white p-5 rounded-theme border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">งบประมาณคงเหลือ</p>
            <h2 className="text-2xl font-bold text-indigo-600 font-mono">
              {stats?.metrics?.remaining_budget?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}
            </h2>
            <p className="text-xs text-slate-400">พร้อมดำเนินการ</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-theme">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Spending Rate */}
        <div className="bg-white p-5 rounded-theme border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">อัตราการเบิกจ่าย</p>
            <h2 className="text-2xl font-bold text-amber-600 font-mono">
              {stats?.metrics?.spending_percentage || 0}%
            </h2>
            <div className="w-28 bg-slate-100 rounded-full h-2 mt-1">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats?.metrics?.spending_percentage || 0)}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-theme">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4 Divisions Breakdown & Strategic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4 Divisions Bar/List Card (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-theme border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-theme-primary" />
              <h2 className="font-bold text-slate-900 text-base">การจัดสรรงบประมาณจำแนกตาม 4 ฝ่ายบริหาร</h2>
            </div>
            <span className="text-xs text-slate-400">ภาพรวมโครงการ</span>
          </div>

          <div className="space-y-4">
            {stats?.division_summary?.map((div: any) => {
              const totalBud = stats?.metrics?.total_allocated || 1;
              const pct = totalBud > 0 ? ((div.totalBudget / totalBud) * 100).toFixed(1) : '0';
              return (
                <div key={div.code} className="p-3.5 bg-slate-50 rounded-theme border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-theme-primary"></span>
                      <span className="font-bold text-slate-800">{div.name} ({div.code})</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {div.totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ({pct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className="bg-theme-primary h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>จำนวน {div.projectCount} โครงการ</span>
                    <Link
                      href={`/divisions/${div.code.toLowerCase()}`}
                      className="text-theme-primary hover:underline font-medium"
                    >
                      ดูรายละเอียดฝ่าย →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strategic Indicators (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-slate-900 text-base">สัดส่วนตามยุทธศาสตร์สถานศึกษา</h2>
            </div>
          </div>

          <div className="space-y-3">
            {stats?.strategic_summary?.length > 0 ? (
              stats.strategic_summary.map((st: any) => (
                <div key={st.code} className="p-3 bg-teal-50/40 rounded-lg border border-teal-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-teal-950">
                    <span>[{st.code}]</span>
                    <span>{st.count} โครงการ</span>
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-2">{st.description}</p>
                  <div className="text-right text-teal-800 font-semibold text-[11px]">
                    งบประมาณ: {st.budget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                ยังไม่มีข้อมูลความสอดคล้องยุทธศาสตร์
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects Data Table with Filters */}
      <div className="bg-white rounded-theme border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-theme-primary" />
            <h2 className="font-bold text-slate-900 text-base">รายการโครงการทั้งหมด</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {filteredProjects.length} รายการ
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="ค้นหาชื่อโครงการ, รหัส, ผู้รับผิดชอบ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-theme outline-none w-60 focus:border-theme-primary transition"
            />

            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-theme outline-none cursor-pointer focus:border-theme-primary transition"
            >
              <option value="">ทุกฝ่ายบริหาร</option>
              <option value="acad">ฝ่ายวิชาการ</option>
              <option value="res">ฝ่ายบริหารทรัพยากร</option>
              <option value="dev">ฝ่ายพัฒนากิจการฯ</option>
              <option value="strat">ฝ่ายแผนงานฯ</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-theme outline-none cursor-pointer focus:border-theme-primary transition"
            >
              <option value="">ทุกสถานะ</option>
              <option value="submitted">ยื่นเสนอแล้ว</option>
              <option value="dept_approved">ผ่านหัวหน้าแผนก</option>
              <option value="deputy_approved">ผ่านรอง ผอ.</option>
              <option value="planning_approved">ผ่านงานแผน</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>
        </div>

        {/* Mobile View: Cards Layout (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-theme border border-slate-200 shadow-xs hover:border-theme-primary transition space-y-3"
              >
                {/* Top Row: Code & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-theme-primary bg-theme-primary-light px-2 py-0.5 rounded border border-theme-primary/20">
                    {p.project_code || 'ยังไม่ออกรหัส'}
                  </span>
                  <div>{getStatusBadge(p.status)}</div>
                </div>

                {/* Project Title */}
                <div>
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-bold text-sm text-slate-900 hover:text-theme-primary line-clamp-2 leading-snug transition-colors"
                  >
                    {p.title}
                  </Link>
                </div>

                {/* Division & Department */}
                <div className="text-xs text-slate-500 space-y-0.5 bg-slate-50 p-2.5 rounded-theme border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{p.department?.division?.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-5 truncate">
                    {p.department?.name}
                  </div>
                  {p.leader?.full_name && (
                    <div className="text-[11px] text-slate-600 pl-5 pt-0.5">
                      ผู้รับผิดชอบ: <span className="font-semibold text-slate-800">{p.leader.full_name}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Budget & Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">งบประมาณ</span>
                    <span className="text-sm font-bold text-slate-900">
                      {Number(p.total_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>

                  <Link
                    href={`/projects/${p.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-theme shadow-xs transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูเอกสาร</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-theme">
              ไม่พบรายการโครงการที่ตรงกับเงื่อนไข
            </div>
          )}
        </div>

        {/* Desktop View: Table Layout (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="p-3">รหัสโครงการ</th>
                <th className="p-3">ชื่อโครงการ</th>
                <th className="p-3">ฝ่าย / แผนกวิชา</th>
                <th className="p-3">ผู้รับผิดชอบ</th>
                <th className="p-3 text-right">งบประมาณ (บาท)</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-theme-primary">
                      {p.project_code || <span className="text-slate-400 font-normal">ยังไม่ออกรหัส</span>}
                    </td>
                    <td className="p-3 font-medium text-slate-900 max-w-xs">
                      <Link href={`/projects/${p.id}`} className="hover:text-theme-primary hover:underline transition-colors">
                        {p.title}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600">
                      <div>{p.department?.division?.name}</div>
                      <div className="text-[11px] text-slate-400">{p.department?.name}</div>
                    </td>
                    <td className="p-3 text-slate-700">{p.leader?.full_name}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {Number(p.total_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">{getStatusBadge(p.status)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/projects/${p.id}`}
                          className="p-1.5 text-slate-600 hover:text-theme-primary hover:bg-theme-primary-light rounded-theme transition-colors"
                          title="ดูรายละเอียด / เอกสาร"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    ไม่พบรายการโครงการที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
