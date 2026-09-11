'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useNotifications } from '@/lib/notification-context';
import { showAlert } from '@/lib/sweetalert';
import ModalPortal from '@/components/ui/ModalPortal';

import {
  FolderKanban,
  FilePlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  ChevronRight,
  Sparkles,
  Building2,
  DollarSign,
  AlertCircle,
  Edit3,
  X,
} from 'lucide-react';

export default function MyProjectsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { currentFiscalYear } = useSettings();
  const { subscribeDataUpdate } = useNotifications();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Modal State for Scanned Document Upload
  const [selectedProjectForDocs, setSelectedProjectForDocs] = useState<any | null>(null);
  const [docsList, setDocsList] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Summary Dropdown State
  const [summaryTemplates, setSummaryTemplates] = useState<any[]>([]);
  const [dropdownOpenId, setDropdownOpenId] = useState<number | null>(null);

  // Scope State (For Admin & Planning Officer)
  const [projectScope, setProjectScope] = useState<'ALL' | 'MINE'>(user?.role === 'ADMIN' || user?.role === 'PLANNING_OFFICER' ? 'ALL' : 'MINE');

  useEffect(() => {
    fetchMyProjects();
    fetchSummaryTemplates();
  }, [token, projectScope]);

  // Real-time Data Update Listener: Automatically refresh project list when changes occur
  useEffect(() => {
    const unsubscribe = subscribeDataUpdate((event) => {
      if (event.scope === 'PROJECTS' || event.scope === 'APPROVALS') {
        fetchMyProjects();
      }
    });
    return () => unsubscribe();
  }, [subscribeDataUpdate, token, projectScope]);

  const fetchSummaryTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/admin/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSummaryTemplates(data.data.filter((t: any) => 
          t.is_active && (t.default_type === 'FULL_SUMMARY' || t.default_type === 'SHORT_SUMMARY')
        ));
      }
    } catch (err) {}
  };

  const fetchMyProjects = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let endpoint = '/api/v1/projects';
      if (projectScope === 'MINE') {
        endpoint = '/api/v1/projects?my_projects=true';
      } else if (user?.role !== 'ADMIN' && user?.role !== 'PLANNING_OFFICER') {
        endpoint = '/api/v1/projects?my_projects=true';
      }
      
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocModal = (project: any) => {
    setSelectedProjectForDocs(project);
    fetchDocsForProject(project.id);
  };

  const fetchDocsForProject = async (id: number) => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/v1/projects/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDocsList(data.data || []);
      }
    } catch (err) {
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectForDocs) return;

    setUploading(true);
    setUploadMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/v1/projects/${selectedProjectForDocs.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadMsg({ type: 'success', text: `อัปโหลดเรียบร้อยแล้ว` });
        fetchDocsForProject(selectedProjectForDocs.id);
        fetchMyProjects();
      } else {
        setUploadMsg({ type: 'error', text: data.message || 'อัปโหลดไม่สำเร็จ' });
      }
    } catch (err: any) {
      setUploadMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string | number) => {
    const confirmed = await showAlert.confirm('ยืนยันการลบไฟล์', 'คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์เอกสารนี้?');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/v1/projects/${selectedProjectForDocs.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDocsList(prev => prev.filter(d => d.id !== docId));
        fetchMyProjects();
        showAlert.success('ลบไฟล์เรียบร้อยแล้ว');
      } else {
        showAlert.error('ลบไม่สำเร็จ', data.message);
      }
    } catch (err) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบไฟล์');
    }
  };

  const handleDeleteProject = async (p: any) => {
    const isRejected = p.status === 'rejected';
    const confirmed = await showAlert.confirm(
      isRejected ? 'ยืนยันการลบโครงการ' : 'ยืนยันการลบแบบร่าง',
      `คุณต้องการลบโครงการ "${p.title}" ใช่หรือไม่? (การดำเนินการนี้ไม่สามารถย้อนกลับได้)`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/projects/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success('ลบโครงการเรียบร้อยแล้ว');
        fetchMyProjects();
      } else {
        showAlert.error('ลบไม่สำเร็จ', data.message);
      }
    } catch (err) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบโครงการ');
    }
  };

  const getApprovalStepInfo = (p: any) => {
    if (p.status === 'draft') {
      return {
        currentStep: 0,
        label: 'แบบร่าง (ยังไม่ยื่นเสนอ)',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: FileText,
      };
    }
    if (p.status === 'rejected') {
      const rejectedApproval = p.approvals?.find((a: any) => a.status === 'REJECTED');
      const step = rejectedApproval?.step_order || 1;
      return {
        currentStep: step,
        label: `ไม่อนุมัติ (ขั้นที่ ${step})`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: XCircle,
        comment: rejectedApproval?.comment,
        approverName: rejectedApproval?.approver?.full_name,
      };
    }
    if (p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed') {
      return {
        currentStep: 4,
        isFinished: true,
        label: 'อนุมัติแล้ว (ครบ ๔ ขั้นตอน)',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle2,
      };
    }

    const revisionApproval = p.approvals?.find((a: any) => a.status === 'REVISION_REQUESTED');
    if (revisionApproval) {
      const step = revisionApproval.step_order;
      const stepNames: Record<number, string> = {
        1: 'ขั้นที่ ๑ (หัวหน้าแผนก/งาน)',
        2: 'ขั้นที่ ๒ (รอง ผอ. ฝ่าย)',
        3: 'ขั้นที่ ๓ (งานแผนงานฯ)',
        4: 'ขั้นที่ ๔ (ผอ.วิทยาลัย)',
      };
      return {
        currentStep: step,
        isRevision: true,
        label: `ขอแก้ไขใน${stepNames[step] || `ขั้นที่ ${step}`}`,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/50',
        icon: RotateCcw,
        comment: revisionApproval.comment,
        approverName: revisionApproval.approver?.full_name,
      };
    }

    // Pending approval steps
    let step = 1;
    const pendingApproval = p.approvals?.find((a: any) => a.status === 'PENDING');
    if (pendingApproval) {
      step = pendingApproval.step_order;
    } else {
      if (p.status === 'submitted') step = 1;
      else if (p.status === 'dept_approved') step = 2;
      else if (p.status === 'deputy_approved') step = 3;
      else if (p.status === 'planning_approved') step = 4;
    }

    const stepLabels: Record<number, string> = {
      1: 'รอขั้นที่ ๑: หน.แผนก/งานเห็นชอบ',
      2: 'รอขั้นที่ ๒: รอง ผอ. ประจำฝ่าย',
      3: 'รอขั้นที่ ๓: งานแผนงานตรวจงบ & รหัส',
      4: 'รอขั้นที่ ๔: ผอ. ลงนามอนุมัติ',
    };

    return {
      currentStep: step,
      label: stepLabels[step] || `รอการอนุมัติขั้นที่ ${step}`,
      badgeClass: 'bg-blue-50 text-blue-900 border-blue-200',
      icon: Clock,
    };
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.project_code?.toLowerCase().includes(search.toLowerCase());
    const matchYear = yearFilter === 'ALL' || String(p.fiscal_year) === yearFilter;
    
    let matchStatus = true;
    if (statusFilter === 'DRAFT') matchStatus = p.status === 'draft';
    else if (statusFilter === 'PENDING') matchStatus = ['submitted', 'dept_approved', 'deputy_approved', 'planning_approved'].includes(p.status);
    else if (statusFilter === 'STEP1') matchStatus = p.status === 'submitted';
    else if (statusFilter === 'STEP2') matchStatus = p.status === 'dept_approved';
    else if (statusFilter === 'STEP3') matchStatus = p.status === 'deputy_approved';
    else if (statusFilter === 'STEP4') matchStatus = p.status === 'planning_approved';
    else if (statusFilter === 'APPROVED') matchStatus = ['approved', 'in_progress', 'completed'].includes(p.status);
    else if (statusFilter === 'REJECT') matchStatus = p.status === 'rejected' || p.approvals?.some((a: any) => a.status === 'REVISION_REQUESTED');

    return matchSearch && matchYear && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-theme-primary text-white rounded-theme shadow-xs">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {user?.role === 'ADMIN' || user?.role === 'PLANNING_OFFICER'
                  ? (projectScope === 'ALL' ? 'ทะเบียนโครงการทั้งหมด (สถานศึกษา)' : 'โครงการที่ฉันรับผิดชอบ')
                  : 'โครงการของฉัน'}
              </h1>
              <p className="text-xs text-slate-500">
                {user?.role === 'ADMIN' || user?.role === 'PLANNING_OFFICER'
                  ? 'ตรวจสอบ ติดตามสถานะ และเข้าถึงโครงการทั้งหมดของสถานศึกษา'
                  : 'ติดตามสถานะโครงการ ส่งข้อเสนอ และพิมพ์เอกสารสรุปโครงการ'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Scope Toggle for Admin & Planning Officer */}
          {(user?.role === 'ADMIN' || user?.role === 'PLANNING_OFFICER') && (
            <div className="flex items-center bg-slate-100 p-1 rounded-theme border border-slate-200">
              <button
                onClick={() => setProjectScope('ALL')}
                className={`px-3 py-1.5 rounded-theme text-xs font-bold transition ${
                  projectScope === 'ALL'
                    ? 'bg-white text-theme-primary shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                โครงการทั้งหมด ({projects.length})
              </button>
              <button
                onClick={() => setProjectScope('MINE')}
                className={`px-3 py-1.5 rounded-theme text-xs font-bold transition ${
                  projectScope === 'MINE'
                    ? 'bg-white text-theme-primary shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                โครงการของฉัน
              </button>
            </div>
          )}

          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2.5 rounded-theme shadow-sm font-bold text-sm transition active:scale-95"
          >
            <FilePlus className="w-5 h-5" />
            <span>สร้างโครงการใหม่</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-theme shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">ค้นหาโครงการ</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="รหัสโครงการ หรือ ชื่อโครงการ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-theme focus:border-theme-primary outline-none text-sm transition"
            />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="yearFilterSelect" className="block text-xs font-bold text-slate-700 mb-1.5">ปีงบประมาณ</label>
          <select
            id="yearFilterSelect"
            aria-label="เลือกปีงบประมาณ"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:border-theme-primary outline-none cursor-pointer transition"
          >
            <option value="ALL">ทุกปีงบประมาณ</option>
            {Array.from({ length: 6 }, (_, i) => {
              const baseYear = parseInt(currentFiscalYear) || 2569;
              const y = baseYear + 2 - i;
              return (
                <option key={y} value={String(y)}>
                  ปีงบประมาณ {y} {y === baseYear ? '(ปัจจุบัน)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">สถานะ / ขั้นตอนการอนุมัติ</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:border-theme-primary outline-none cursor-pointer transition"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="DRAFT">แบบร่าง (ยังไม่ยื่นเสนอ)</option>
            <option value="PENDING">อยู่ระหว่างขออนุมัติ (ทั้งหมด)</option>
            <option value="STEP1">ขั้นที่ ๑: รอหัวหน้าแผนก/งาน</option>
            <option value="STEP2">ขั้นที่ ๒: รอรอง ผอ. ประจำฝ่าย</option>
            <option value="STEP3">ขั้นที่ ๓: รอยานแผนงานตรวจงบ & รหัส</option>
            <option value="STEP4">ขั้นที่ ๔: รอ ผอ.วิทยาลัย</option>
            <option value="APPROVED">อนุมัติเรียบร้อย</option>
            <option value="REJECT">ไม่อนุมัติ / ขอแก้ไข</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-theme border border-slate-200">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-theme-primary border-t-transparent rounded-full mb-2"></div>
          <p className="text-xs">กำลังโหลดข้อมูลโครงการของฉัน...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-theme border border-slate-200">
          <h3 className="text-base font-bold text-slate-700">ไม่พบโครงการ</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((p) => {
            const isApproved = p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed';
            const stepInfo = getApprovalStepInfo(p);
            const StepIcon = stepInfo.icon;

            return (
              <div
                key={p.id}
                className="bg-white rounded-theme border border-slate-200 shadow-xs hover:shadow-md hover:border-theme-primary transition p-5 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.project_code ? (
                        <span className="px-2.5 py-0.5 rounded-theme font-mono font-bold text-xs bg-theme-primary-light text-theme-primary border border-theme-primary/20">
                          {p.project_code}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-theme text-[11px] bg-slate-100 text-slate-500">รอออกรหัส</span>
                      )}

                      {/* Approval Step Badge */}
                      <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${stepInfo.badgeClass}`}>
                        <StepIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{stepInfo.label}</span>
                      </span>
                    </div>

                    <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                      <Link href={`/projects/${p.id}`} className="hover:text-theme-primary transition">
                        {p.title}
                      </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400"/> {p.department?.name || '-'} ({p.department?.division?.name || 'ฝ่าย'})</span>
                      {p.leader && (
                        <span className="flex items-center gap-1"><span className="text-slate-400">ผู้รับผิดชอบ:</span> <span className="font-medium text-slate-700">{p.leader.full_name}</span></span>
                      )}
                      <span className="flex items-center gap-1 font-bold text-slate-800"><DollarSign className="w-3.5 h-3.5 text-slate-400"/> {Number(p.total_budget || 0).toLocaleString()} บาท</span>
                      <span className="text-slate-400">• ปีงบประมาณ {p.fiscal_year}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
                    {(p.status === 'draft' || p.status === 'rejected' || stepInfo.isRevision) && (
                      <Link
                        href={`/projects/${p.id}/edit`}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-theme border border-amber-200 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไขโครงการ</span>
                      </Link>
                    )}
                    {(() => {
                      const isAtOrPastDirectorStage =
                        p.status === 'planning_approved' ||
                        p.status === 'approved' ||
                        p.status === 'in_progress' ||
                        p.status === 'completed' ||
                        p.approvals?.some((a: any) => a.step_order === 4 && (a.status === 'APPROVED' || a.status === 'PENDING'));
                      const canDelete = !isAtOrPastDirectorStage && (user?.role === 'ADMIN' || p.status === 'draft' || p.status === 'rejected');
                      if (!canDelete) return null;
                      return (
                        <button
                          onClick={() => handleDeleteProject(p)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-theme border border-red-200 transition"
                          title="ลบโครงการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบโครงการ</span>
                        </button>
                      );
                    })()}
                    {isApproved && (
                      <Link
                        href={`/projects/${p.id}?tab=summary`}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-gradient hover:brightness-110 text-white text-xs font-bold rounded-theme shadow-sm transition"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>สรุปโครงการ</span>
                      </Link>
                    )}

                    <button
                      onClick={() => handleOpenDocModal(p)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-theme transition"
                    >
                      <UploadCloud className="w-4 h-4 text-theme-primary" />
                      <span>แนบไฟล์สแกน ({p.documents?.length || 0})</span>
                    </button>
                  </div>
                </div>

                {/* 4-Step Visual Approval Progress Pipeline */}
                {p.status !== 'draft' && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-theme-primary" />
                        <span>ความก้าวหน้าสายการอนุมัติ ๔ ขั้นตอน:</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { step: 1, label: '๑. หน.แผนก/งาน', desc: 'เห็นชอบขั้นต้น' },
                        { step: 2, label: '๒. รอง ผอ. ฝ่าย', desc: 'พิจารณากลั่นกรอง' },
                        { step: 3, label: '๓. งานแผนงานฯ', desc: 'ตรวจงบ & ออกรหัส' },
                        { step: 4, label: '๔. ผู้อำนวยการ', desc: 'อนุมัติโครงการ' },
                      ].map((st) => {
                        const app = p.approvals?.find((a: any) => a.step_order === st.step);
                        const isAppApproved = app?.status === 'APPROVED' || ((p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed') && (!app || app.status !== 'REJECTED'));
                        const isAppPending = app?.status === 'PENDING' || (!app && ((p.status === 'submitted' && st.step === 1) || (p.status === 'dept_approved' && st.step === 2) || (p.status === 'deputy_approved' && st.step === 3) || (p.status === 'planning_approved' && st.step === 4)));
                        const isAppRevision = app?.status === 'REVISION_REQUESTED';
                        const isAppRejected = app?.status === 'REJECTED';

                        let stepState: 'approved' | 'pending' | 'revision' | 'rejected' | 'waiting' = 'waiting';
                        if (isAppRejected) stepState = 'rejected';
                        else if (isAppRevision) stepState = 'revision';
                        else if (isAppApproved) stepState = 'approved';
                        else if (isAppPending) stepState = 'pending';

                        return (
                          <div
                            key={st.step}
                            className={`p-2 rounded-lg border text-xs transition flex items-center gap-2 ${
                              stepState === 'approved'
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : stepState === 'pending'
                                ? 'bg-blue-50 border-blue-300 text-blue-950 shadow-2xs ring-1 ring-blue-400/30'
                                : stepState === 'revision'
                                ? 'bg-amber-50 border-amber-300 text-amber-950 animate-pulse'
                                : stepState === 'rejected'
                                ? 'bg-rose-50 border-rose-200 text-rose-950'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              stepState === 'approved'
                                ? 'bg-emerald-600 text-white'
                                : stepState === 'pending'
                                ? 'bg-blue-600 text-white animate-pulse'
                                : stepState === 'revision'
                                ? 'bg-amber-600 text-white'
                                : stepState === 'rejected'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {stepState === 'approved' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : stepState === 'revision' ? (
                                <RotateCcw className="w-3 h-3" />
                              ) : stepState === 'rejected' ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                st.step
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[11px] font-bold truncate leading-tight ${
                                stepState === 'pending' ? 'text-blue-900' : stepState === 'approved' ? 'text-emerald-900' : ''
                              }`}>
                                {st.label}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate leading-tight">
                                {stepState === 'approved'
                                  ? 'อนุมัติแล้ว'
                                  : stepState === 'pending'
                                  ? 'กำลังรอพิจารณา'
                                  : stepState === 'revision'
                                  ? 'ขอให้แก้ไข'
                                  : stepState === 'rejected'
                                  ? 'ไม่อนุมัติ'
                                  : 'รอตามลำดับ'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback / Revision comment alert if available */}
                    {stepInfo.comment && (
                      <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                        stepInfo.isRevision
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">ข้อความจากผู้อนุมัติ{stepInfo.approverName ? ` (${stepInfo.approverName})` : ''}:</span>{' '}
                          <span>"{stepInfo.comment}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Docs Modal */}
      {selectedProjectForDocs && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 bg-theme-primary text-white flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold">อัปโหลดไฟล์เอกสารสแกน</h2>
                <button onClick={() => setSelectedProjectForDocs(null)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">อัปโหลดไฟล์ใหม่</h3>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={fileInputRef}
                      className="flex-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-theme file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                    <button
                      onClick={() => handleFileUpload({ target: { files: fileInputRef.current?.files } } as any)}
                      disabled={uploading}
                      className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-theme text-sm font-bold transition"
                    >
                      {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
                    </button>
                  </div>
                  {uploadMsg && (
                    <p className={`mt-2 text-xs font-bold ${uploadMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                      {uploadMsg.text}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">ไฟล์เอกสาร ({docsList.length})</h3>
                  {loadingDocs ? (
                    <p className="text-sm text-slate-500">กำลังโหลด...</p>
                  ) : docsList.length === 0 ? (
                    <p className="text-sm text-slate-500">ยังไม่มีไฟล์เอกสาร</p>
                  ) : (
                    <div className="space-y-2">
                      {docsList.map(doc => (
                        <div key={doc.id} className="flex justify-between items-center p-3 border rounded-theme">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-theme-primary" />
                            <a href={`/api/v1/projects/${selectedProjectForDocs.id}/documents/${doc.id}`} target="_blank" rel="noreferrer" className="text-sm text-theme-primary hover:underline">
                              {doc.file_name}
                            </a>
                          </div>
                          <button onClick={() => handleDeleteDoc(doc.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
