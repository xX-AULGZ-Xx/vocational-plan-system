'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { showAlert } from '@/lib/sweetalert';

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
  X,
} from 'lucide-react';

export default function MyProjectsPage() {
  const router = useRouter();
  const { token, user } = useAuth();

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
    const confirmed = await showAlert.confirm(
      'ยืนยันการลบแบบร่าง',
      `คุณต้องการลบแบบร่างโครงการ "${p.title}" ใช่หรือไม่? (การดำเนินการนี้ไม่สามารถย้อนกลับได้)`
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

  const filteredProjects = projects.filter((p) => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.project_code?.toLowerCase().includes(search.toLowerCase());
    const matchYear = yearFilter === 'ALL' || String(p.fiscal_year) === yearFilter;
    
    let matchStatus = true;
    if (statusFilter === 'DRAFT') matchStatus = p.status === 'draft';
    else if (statusFilter === 'PENDING') matchStatus = ['submitted', 'dept_approved', 'deputy_approved', 'planning_approved'].includes(p.status);
    else if (statusFilter === 'APPROVED') matchStatus = p.status === 'approved';
    else if (statusFilter === 'REJECT') matchStatus = p.status === 'rejected';

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
          <label className="block text-xs font-bold text-slate-700 mb-1.5">สถานะ</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-sm focus:border-theme-primary outline-none cursor-pointer transition"
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="DRAFT">ร่างโครงการ</option>
            <option value="PENDING">รออนุมัติ</option>
            <option value="APPROVED">อนุมัติแล้ว</option>
            <option value="REJECT">ไม่อนุมัติ</option>
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
            const isApproved = p.status === 'approved';
            
            return (
              <div
                key={p.id}
                className="bg-white rounded-theme border border-slate-200 shadow-xs hover:shadow-md hover:border-theme-primary transition p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.project_code ? (
                      <span className="px-2.5 py-0.5 rounded-theme font-mono font-bold text-xs bg-theme-primary-light text-theme-primary border border-theme-primary/20">
                        {p.project_code}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-theme text-[11px] bg-slate-100 text-slate-500">รอออกรหัส</span>
                    )}
                    
                    {p.status === 'draft' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <FileText className="w-3.5 h-3.5" /> แบบร่าง
                      </span>
                    ) : p.status === 'approved' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว
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
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                    <Link href={`/projects/${p.id}`} className="hover:text-theme-primary transition">
                      {p.title}
                    </Link>
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5"/> {p.department?.name || '-'}</span>
                    {p.leader && (
                      <span className="flex items-center gap-1"><span className="text-slate-400">ผู้รับผิดชอบ:</span> {p.leader.full_name}</span>
                    )}
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5"/> {Number(p.total_budget || 0).toLocaleString()} บาท</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {p.status === 'draft' && (
                    <>
                      <Link
                        href={`/projects/${p.id}/edit`}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-theme border border-amber-200 transition"
                      >
                        <span>แก้ไขแบบร่าง</span>
                      </Link>
                      <button
                        onClick={() => handleDeleteProject(p)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-theme border border-red-200 transition"
                        title="ลบแบบร่างโครงการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบแบบร่าง</span>
                      </button>
                    </>
                  )}
                  {isApproved && summaryTemplates.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpenId(dropdownOpenId === p.id ? null : p.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-gradient hover:brightness-110 text-white text-xs font-bold rounded-theme shadow-sm transition"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>สรุปโครงการ</span>
                        <ChevronRight className={`w-3 h-3 transition-transform ${dropdownOpenId === p.id ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {dropdownOpenId === p.id && (
                        <div className="absolute right-0 bottom-full mb-1 w-64 bg-white border border-slate-200 rounded-theme shadow-lg z-50 py-1 overflow-hidden">
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            เลือกแบบฟอร์มสรุป
                          </div>
                          {summaryTemplates.map(tpl => (
                            <Link
                              key={tpl.id}
                              href={`/projects/${p.id}/summary?templateId=${tpl.id}`}
                              className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-theme-primary-light hover:text-theme-primary transition-colors"
                            >
                              {tpl.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
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
            );
          })}
        </div>
      )}

      {/* Docs Modal */}
      {selectedProjectForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
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
      )}
    </div>
  );
}
