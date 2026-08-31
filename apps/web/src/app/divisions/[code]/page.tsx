'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
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

  // Aggregate stats
  const allProjects = division.departments?.flatMap((d: any) => d.projects || []) || [];
  const totalBudget = allProjects.reduce((sum: number, p: any) => sum + (Number(p.total_budget) || 0), 0);

  const isAdmin = user && user.role === 'ADMIN';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-theme border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-theme bg-theme-primary text-white flex items-center justify-center shadow-md shrink-0">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{division.name}</h1>
              <span className="px-2.5 py-0.5 rounded-theme font-mono font-bold text-xs bg-theme-primary-light text-theme-primary border border-theme-primary/20">
                {division.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              มี {division.departments?.length || 0} แผนกวิชา/งาน • โครงการทั้งหมด {allProjects.length} รายการ
            </p>
          </div>
        </div>

        {/* Right side: Deputy Director Info & Budget */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Deputy Director Card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-theme">
            <div className="w-10 h-10 rounded-theme bg-theme-primary-light text-theme-primary flex items-center justify-center border border-theme-primary/20 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold text-slate-400">รองผู้อำนวยการประจำฝ่าย</p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setDeputyName(division.deputy_name || '');
                      setDeputyPosition(division.deputy_position || `รองผู้อำนวยการ${division.name}`);
                      setShowDeputyModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-theme-primary hover:bg-theme-primary-light rounded transition"
                    title="แก้ไขชื่อรองผู้อำนวยการ"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-slate-800">
                {division.deputy_name || (
                  <span className="text-slate-400 font-normal italic">
                    {isAdmin ? 'ยังไม่ได้ระบุ (คลิกดินสอเพื่อเพิ่ม)' : 'ยังไม่ได้ระบุชื่อ'}
                  </span>
                )}
              </p>
              {division.deputy_name && division.deputy_position && (
                <p className="text-[10px] text-slate-500">{division.deputy_position}</p>
              )}
            </div>
          </div>

          {/* Total Budget Card */}
          <div className="text-right p-3 bg-theme-primary-light/70 border border-theme-primary/20 rounded-theme">
            <p className="text-[11px] text-slate-500">งบประมาณรวมทั้งฝ่าย</p>
            <p className="text-lg font-bold text-theme-primary">
              {totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">บาท</span>
            </p>
          </div>
        </div>
      </div>

      {/* Departments Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {division.departments?.map((dept: any) => {
          const deptBudget = (dept.projects || []).reduce(
            (s: number, p: any) => s + (Number(p.total_budget) || 0),
            0
          );
          return (
            <div key={dept.id} className="bg-white p-5 rounded-theme border border-slate-200 shadow-sm space-y-3 hover:border-theme-primary transition">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">{dept.name}</h3>
                <span className="text-xs font-semibold text-theme-primary">
                  {deptBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>

              <div className="space-y-2">
                {dept.projects && dept.projects.length > 0 ? (
                  dept.projects.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-slate-50 rounded-theme border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100 transition"
                    >
                      <div className="truncate max-w-[70%]">
                        <Link href={`/projects/${p.id}`} className="font-medium text-slate-800 hover:text-theme-primary transition">
                          {p.title}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.project_code || 'ยังไม่ออกรหัส'} • {p.leader?.full_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          {Number(p.total_budget).toLocaleString('th-TH')} ฿
                        </div>
                        <Link href={`/projects/${p.id}`} className="text-theme-primary text-[11px] hover:underline inline-flex items-center gap-0.5 mt-0.5">
                          <Eye className="w-3 h-3" /> ดูเอกสาร
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">ยังไม่มีโครงการในแผนกนี้</p>
                )}
              </div>
            </div>
          );
        })}
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
