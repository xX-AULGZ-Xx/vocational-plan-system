'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import A4DocumentPreview, { ProjectFormData } from '@/components/preview/A4DocumentPreview';
import ProjectSummaryModal from '@/components/reports/ProjectSummaryModal';
import ProjectSummaryTab from '@/components/reports/ProjectSummaryTab';
import EvaluationTab from '@/components/evaluation/EvaluationTab';
import {
  ArrowLeft,
  Printer,
  ZoomIn,
  ZoomOut,
  Send,
  Edit3,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Check,
  X,
  RotateCcw,
  UploadCloud,
  Download,
  Trash2,
  Paperclip,
  FileText,
  Sparkles,
  BookOpen,
  ChevronDown,
  DollarSign,
  Coins,
  ClipboardCheck,
} from 'lucide-react';

const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { collegeName } = useSettings();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<number>(0.85);
  const [activeTab, setActiveTab] = useState<'details' | 'approvals' | 'attachments' | 'evaluation' | 'summary'>('details');

  const parsedDynamicData = useMemo(() => {
    if (!project?.dynamic_data) return {};
    let temp = project.dynamic_data;
    while (typeof temp === 'string') {
      try { temp = JSON.parse(temp); } catch { break; }
    }
    return temp || {};
  }, [project?.dynamic_data]);

  // Submit project state
  const [submitting, setSubmitting] = useState(false);

  // Summary Modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSummaryDropdown, setShowSummaryDropdown] = useState(false);

  // Scanned document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadMsg, setDocUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Approval action modal state
  const [actionType, setActionType] = useState<'APPROVE' | 'REVISE' | 'REJECT' | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchProject();
  }, [projectId, token]);

  const fetchProject = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/projects/${projectId}`, { headers });
      const data = await res.json();
      if (data.success) {
        setProject(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewDocx = async () => {
    if (!project) return;
    try {
      // Find template id from project or default template
      const templateId = project.template?.id || project.template_id;
      if (!templateId) {
        showAlert.warning('ไม่พบแม่แบบเอกสาร', 'โครงการนี้ไม่มีแม่แบบเอกสารที่เชื่อมโยง');
        return;
      }

      // Combine form data from project & dynamic_data
      const formData = {
        ...(parsedDynamicData || {}),
        title: project.title,
        fiscal_year: project.fiscal_year,
        project_code: project.project_code,
        department_name: project.department?.name,
        division_name: project.department?.division?.name,
        leader_name: project.leader?.full_name,
        leader_position: project.leader?.position,
        total_budget: project.total_budget,
        budget_items: project.budget_items || [],
        timelines: project.timelines || [],
      };

      const res = await fetch('/api/v1/documents/export-dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: templateId,
          formData,
          format: 'docx'
        })
      });

      const data = await res.json();
      if (data.success && data.download_url) {
        window.location.href = data.download_url;
      } else {
        showAlert.error('สร้างตัวอย่างไม่สำเร็จ', data.message || 'ไม่สามารถสร้างเอกสารตัวอย่างได้');
      }
    } catch (e: any) {
      showAlert.error('ข้อผิดพลาด', e.message || 'เกิดข้อผิดพลาดในการสร้างตัวอย่างเอกสาร');
    }
  };

  const handleSubmitProject = async () => {
    if (!project) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setActionMsg('ยื่นเสนอโครงการเพื่อขออนุมัติเรียบร้อยแล้ว');
      fetchProject();
    } catch (err: any) {
      showAlert.error('ยื่นเสนอไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาดในการยื่นเสนอโครงการ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalAction = async () => {
    if (!actionType || !project) return;
    setIsProcessing(true);

    try {
      // Find pending approval step id
      const pendingApproval = project.approvals?.find((a: any) => a.status === 'PENDING');
      if (!pendingApproval) {
        throw new Error('ไม่พบขั้นตอนที่รอการอนุมัติ');
      }

      const res = await fetch(`/api/v1/approvals/${pendingApproval.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: actionType,
          comment,
        }),
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.message || 'ดำเนินการไม่สำเร็จ');
      }

      showAlert.success('บันทึกผลการพิจารณาเรียบร้อยแล้ว', resData.message);
      setActionMsg(resData.message);
      setActionType(null);
      setComment('');
      fetchProject();
    } catch (err: any) {
      showAlert.error('เกิดข้อผิดพลาด', err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploadingDoc(true);
    setDocUploadMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/v1/projects/${project.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success('อัปโหลดสำเร็จ', `อัปโหลดไฟล์ "${file.name}" เรียบร้อยแล้ว`);
        setDocUploadMsg({ type: 'success', text: `อัปโหลดไฟล์ "${file.name}" เรียบร้อยแล้ว` });
        fetchProject();
      } else {
        showAlert.error('อัปโหลดไม่สำเร็จ', data.message);
        setDocUploadMsg({ type: 'error', text: data.message || 'อัปโหลดไม่สำเร็จ' });
      }
    } catch (err: any) {
      showAlert.error('ข้อผิดพลาด', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setDocUploadMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDocDelete = async (docId: string | number) => {
    const confirmed = await showAlert.confirm('ยืนยันการลบไฟล์', 'คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์เอกสารนี้?');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success('ลบไฟล์เรียบร้อยแล้ว');
        fetchProject();
      } else {
        showAlert.error('ลบไม่สำเร็จ', data.message);
      }
    } catch (err) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบไฟล์');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full mb-2"></div>
        <p>กำลังโหลดข้อมูลโครงการ...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
        <p>ไม่พบข้อมูลโครงการที่ระบุ</p>
      </div>
    );
  }

  // Convert project to form data structure for A4 preview
  const previewData: ProjectFormData = {
    title: project.title,
    fiscal_year: project.fiscal_year,
    project_code: project.project_code,
    template_id: project.template_id,
    template_name: project.template?.name || '',
    department_name: project.department?.name,
    division_name: project.department?.division?.name,
    leader_name: project.leader?.full_name,
    leader_position: project.leader?.position,
    background: project.background,
    objectives: Array.isArray(project.objectives) ? project.objectives : [],
    target_quantitative: project.target_groups?.quantitative || '',
    target_qualitative: project.target_groups?.qualitative || '',
    expected_results: project.expected_results,
    timelines: project.timelines || [],
    budget_items: project.budget_items || [],
    mappings: project.template?.mappings || {},
  };

  const pendingApproval = project.approvals?.find((a: any) => a.status === 'PENDING');
  
  const isDraft = project.status === 'draft';
  const canUploadDoc = !isDraft && user && (user.id === project.leader?.id || user.role === 'ADMIN' || user.role === 'PLANNING_OFFICER');
const canApprove =
    user &&
    pendingApproval &&
    (user.role === 'ADMIN' ||
      (pendingApproval.step_order === 1 && user.role === 'HEAD_DEPT') ||
      (pendingApproval.step_order === 2 && user.role === 'DEPUTY_DIRECTOR') ||
      (pendingApproval.step_order === 3 && user.role === 'PLANNING_OFFICER') ||
      (pendingApproval.step_order === 4 && user.role === 'DIRECTOR'));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
              {project.project_code && (
                <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-blue-100 text-blue-900">
                  {project.project_code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              สังกัด: {project.department?.name} ({project.department?.division?.name}) • ผู้เสนอ:{' '}
              {project.leader?.full_name}
            </p>
          </div>
        </div>

          {/* Approval Actions or Print or Project Summary */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Approved Project: Summary Hub with Options (Booklet & One-Page) */}
            {project.status === 'approved' && (
              <div className="relative">
                <div className="flex items-center">
                  <button
                    onClick={() => setShowSummaryModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-l-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:brightness-110 text-white shadow-sm transition"
                    title="เปิดศูนย์สรุปผลโครงการ (เลือกดูแบบรูปเล่ม หรือ สรุปแผ่นเดียว)"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>สรุปโครงการ</span>
                  </button>
                  <button
                    onClick={() => setShowSummaryDropdown(!showSummaryDropdown)}
                    className="px-2 py-2 text-xs font-bold rounded-r-xl bg-blue-950 hover:bg-slate-900 text-white border-l border-blue-800 shadow-sm transition"
                    title="ตัวเลือกการสรุปโครงการ"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown Options */}
                {showSummaryDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                    <p className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      รูปแบบการสรุปโครงการ
                    </p>

                    <button
                      onClick={() => {
                        setShowSummaryDropdown(false);
                        setShowSummaryModal(true);
                      }}
                      className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left hover:bg-blue-50 text-slate-800 transition group"
                    >
                      <div className="p-1.5 rounded-md bg-blue-100 text-blue-900 group-hover:bg-blue-900 group-hover:text-white transition mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">๑. สรุปแผ่นเดียว (One-Page)</p>
                        <p className="text-[10px] text-slate-500">Executive Summary กระชับ ๑ หน้า A4</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowSummaryDropdown(false);
                        setShowSummaryModal(true);
                      }}
                      className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left hover:bg-indigo-50 text-slate-800 transition group"
                    >
                      <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-900 group-hover:bg-indigo-900 group-hover:text-white transition mt-0.5">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">๒. สรุปแบบรูปเล่ม (Full Booklet)</p>
                        <p className="text-[10px] text-slate-500">รายงานผลการดำเนินงานฉบับสมบูรณ์พร้อมหน้าปก</p>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <a
                        href={`/api/v1/projects/${project.id}/export-summary-docx`}
                        download
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-slate-100 text-xs font-bold text-blue-900 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลดไฟล์ Word (.docx)</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Document Button (Download / View DOCX) */}
            <button
              onClick={handlePreviewDocx}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-theme bg-theme-primary-light hover:bg-theme-primary hover:text-white text-theme-primary border border-theme-primary/20 shadow-xs transition transform active:scale-95"
              title="ดาวน์โหลดหรือดูตัวอย่างเอกสารข้อเสนอโครงการ (.docx)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ดูตัวอย่างเอกสาร</span>
            </button>

            {/* If Draft: Edit Project Button */}
            {project.status === 'draft' && (
              <Link
                href={`/projects/${project.id}/edit`}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition transform active:scale-95"
                title="แก้ไขข้อมูลโครงการแบบร่าง"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>แก้ไขโครงการ</span>
              </Link>
            )}

            {/* If Draft / Rejected: Submit for Approval Button */}
            {(project.status === 'draft' || project.status === 'rejected') && (
              <button
                onClick={handleSubmitProject}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white shadow-sm transition transform active:scale-95"
                title="ยื่นเสนอโครงการเข้าสู่กระบวนการพิจารณาและอนุมัติ"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'กำลังส่งโครงการ...' : 'ยื่นเสนอขออนุมัติโครงการ'}</span>
              </button>
            )}

            {/* Approval Action Buttons (for approvers / admin) */}
            {canApprove && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActionType('APPROVE');
                    setComment('เห็นชอบตามเสนอ สมควรดำเนินการ');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-theme bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                >
                  <Check className="w-4 h-4" />
                  <span>อนุมัติเห็นชอบ</span>
                </button>
                <button
                  onClick={() => {
                    setActionType('REVISE');
                    setComment('ขอให้ปรับปรุงรายละเอียดเพิ่มเติม');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-theme bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ขอให้แก้ไข</span>
                </button>
                <button
                  onClick={() => {
                    setActionType('REJECT');
                    setComment('ไม่อนุมัติโครงการ');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-theme bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition"
                >
                  <X className="w-4 h-4" />
                  <span>ไม่อนุมัติ</span>
                </button>
              </div>
            )}

            {project.status !== 'approved' && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-theme shadow-sm transition"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>พิมพ์เอกสาร</span>
              </button>
            )}
          </div>
        </div>

        {actionMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-theme text-xs font-medium">
            {actionMsg}
          </div>
        )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print overflow-x-auto pb-px">
        {[
          { id: 'details', label: 'รายละเอียดโครงการ', icon: BookOpen },
          { id: 'approvals', label: 'สายการอนุมัติ', icon: UserCheck },
          { id: 'attachments', label: 'ไฟล์แนบ', icon: Paperclip },
          { id: 'evaluation', label: 'ประเมินความพึงพอใจ', icon: ClipboardCheck },
          { id: 'summary', label: 'สรุปโครงการ', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap rounded-t-theme ${
                isActive
                  ? 'border-theme-primary text-theme-primary bg-theme-primary-light'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

{activeTab === 'approvals' && (

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm no-print space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          สายการอนุมัติ 4 ขั้นตอน (Approval Chain Workflow)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: 1, title: 'หัวหน้าแผนก/งาน', code: 'dept_approved' },
            { step: 2, title: 'รอง ผอ. ประจำฝ่าย', code: 'deputy_approved' },
            { step: 3, title: 'งานแผนงาน (ออกรหัส)', code: 'planning_approved' },
            { step: 4, title: 'ผู้อำนวยการวิทยาลัย', code: 'approved' },
          ].map((item) => {
            const stepApproval = project.approvals?.find((a: any) => a.step_order === item.step);
            const isApproved = stepApproval?.status === 'APPROVED';
            const isPending = stepApproval?.status === 'PENDING';
            const isRevise = stepApproval?.status === 'REVISION_REQUESTED';
            const isReject = stepApproval?.status === 'REJECTED';

            return (
              <div
                key={item.step}
                className={`p-3.5 rounded-xl border transition ${
                  isApproved
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : isPending
                    ? 'bg-blue-50/70 border-blue-400 text-blue-950 shadow-sm ring-2 ring-blue-900/10'
                    : isRevise
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : isReject
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold">ขั้นที่ {item.step}</span>
                  {isApproved && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {isPending && <Clock className="w-4 h-4 text-blue-600 animate-pulse" />}
                  {isRevise && <RotateCcw className="w-4 h-4 text-amber-600" />}
                  {isReject && <X className="w-4 h-4 text-rose-600" />}
                </div>
                <div className="text-xs font-bold">{item.title}</div>
                <div className="text-[11px] mt-1">
                  {stepApproval?.approver?.full_name ? (
                    <span className="font-medium text-slate-700">โดย: {stepApproval.approver.full_name}</span>
                  ) : isPending ? (
                    <span className="text-blue-700 font-semibold">รอการพิจารณา</span>
                  ) : (
                    <span className="text-slate-400">ยังไม่ถึงขั้นตอน</span>
                  )}
                </div>
                {stepApproval?.comment && (
                  <p className="text-[11px] mt-1.5 p-1.5 bg-white/80 rounded border text-slate-700 italic">
                    "{stepApproval.comment}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Scanned Files & Attachments Section */}

      {/* Scanned Files & Attachments Section */}
      {activeTab === 'attachments' && (
        <div className="bg-white p-5 rounded-theme border border-slate-200 shadow-xs no-print space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-theme-primary" />
              <span>ไฟล์สแกนและเอกสารแนบ ({project.documents?.length || 0})</span>
            </h3>
            <p className="text-xs text-slate-500">
              อัปโหลดไฟล์บันทึกข้อความที่ลงนามแล้ว, คำสั่งแต่งตั้ง, ภาพกิจกรรม หรือเอกสารจัดซื้อจัดจ้าง
            </p>
          </div>

          {canUploadDoc && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleDocUpload}
              accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
              className="hidden"
              id="detail-doc-upload"
              disabled={uploadingDoc}
            />
            <label
              htmlFor="detail-doc-upload"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-theme cursor-pointer shadow-xs transition ${
                uploadingDoc ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploadingDoc ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังอัปโหลด...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>+ อัปโหลดไฟล์สแกน</span>
                </>
              )}
            </label>
          </div>
          )}

          {isDraft && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-theme flex items-center gap-1.5 font-medium">
              <span>⚠️ โครงการยังเป็นแบบร่าง (จะสามารถแนบไฟล์ได้หลังจากกดเสนอโครงการแล้ว)</span>
            </div>
          )}
        </div>

        {docUploadMsg && (
          <div
            className={`p-2.5 rounded-theme text-xs font-medium ${
              docUploadMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {docUploadMsg.text}
          </div>
        )}

        {project.documents?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {project.documents.map((doc: any) => (
              <div
                key={doc.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-theme flex items-center justify-between gap-2 text-xs hover:bg-slate-100/80 transition"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-theme-primary shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-semibold text-slate-800 truncate" title={doc.file_name}>
                      {doc.file_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {doc.file_type?.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/v1/projects/documents/${doc.id}/download`}
                    download
                    className="p-1.5 text-theme-primary hover:bg-theme-primary-light rounded-theme transition"
                    title="ดาวน์โหลดไฟล์"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {canUploadDoc && (
                  <button
                    onClick={() => handleDocDelete(doc.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-theme transition"
                    title="ลบไฟล์"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-theme">
            ยังไม่มีไฟล์สแกนหรือเอกสารแนบในโครงการนี้
          </div>
        )}
      </div>
      )}

      {activeTab === 'evaluation' && (
        <EvaluationTab
          projectId={projectId}
          project={project}
          token={token}
          user={user}
        />
      )}

      {activeTab === 'summary' && (
        <ProjectSummaryTab
          project={project}
          token={token}
          onProjectUpdated={fetchProject}
        />
      )}

      {activeTab === 'details' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">รายละเอียดโครงการ</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-slate-500 mb-1 text-xs">รหัสโครงการ</p>
              <p className="font-semibold text-slate-800">{project.project_code || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 text-xs">ปีงบประมาณ</p>
              <p className="font-semibold text-slate-800">{project.fiscal_year || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 text-xs">ฝ่าย / กลุ่มงาน</p>
              <p className="font-semibold text-slate-800">{project.department?.division?.name || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 text-xs">แผนกวิชา / งาน</p>
              <p className="font-semibold text-slate-800">{project.department?.name || '-'}</p>
            </div>
          </div>

          {/* Budget Matrix Table Section */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>ตารางประมาณการงบประมาณ</span>
              </h3>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800">
                <span>งบประมาณรวมทั้งสิ้น:</span>
                <span className="text-sm text-emerald-900 font-black">
                  {Number(project.total_budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span>บาท</span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-xs text-center text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 font-bold border-b border-slate-200">
                    <th rowSpan={2} className="px-4 py-3 text-left w-1/4 border-r border-slate-200 text-slate-900 font-bold">
                      หมวดรายจ่าย / ประเภทรายจ่าย
                    </th>
                    <th colSpan={4} className="px-4 py-2 border-r border-slate-200 text-slate-900 font-bold bg-slate-100">
                      จำนวนเงิน (บาท)
                    </th>
                    <th rowSpan={2} className="px-4 py-3 w-1/5 text-slate-900 font-bold">
                      หมายเหตุ
                    </th>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b border-slate-200 text-[11px] text-slate-700">
                    <th className="px-3 py-2.5 border-r border-slate-200 w-28">งบประมาณ</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 w-32">เงินรายได้สถานศึกษา</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 w-36">
                      งบเงินอุดหนุน<br />
                      <span className="text-[10px] font-normal text-slate-500">(ค่ากิจกรรมพัฒนาคุณภาพผู้เรียน)</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-slate-200 w-28">งบอื่นๆ ........</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(() => {
                    const rows = [
                      { key: 'compensation', label: 'ค่าตอบแทน' },
                      { key: 'operating', label: 'ค่าใช้สอย' },
                      { key: 'material', label: 'ค่าวัสดุ' },
                    ];

                    // Group items by category and source
                    const budgetItems = Array.isArray(project.budget_items) ? project.budget_items : [];
                    
                    const matrix: Record<string, { gov: number; revenue: number; subsidy: number; other: number; note: string }> = {
                      compensation: { gov: 0, revenue: 0, subsidy: 0, other: 0, note: '' },
                      operating: { gov: 0, revenue: 0, subsidy: 0, other: 0, note: '' },
                      material: { gov: 0, revenue: 0, subsidy: 0, other: 0, note: '' },
                    };

                    budgetItems.forEach((b: any) => {
                      const catName = (b.category?.name || b.description || '').toLowerCase();
                      let rowKey = 'operating';
                      if (catName.includes('ตอบแทน')) rowKey = 'compensation';
                      else if (catName.includes('วัสดุ')) rowKey = 'material';
                      else if (catName.includes('ใช้สอย')) rowKey = 'operating';

                      const amount = Number(b.total_amount) || (Number(b.quantity || 0) * Number(b.unit_price || 0));
                      const sourceType = b.category?.source_type || '';

                      if (sourceType === 'GOVERNMENT' || catName.includes('งบประมาณ')) {
                        matrix[rowKey].gov += amount;
                      } else if (sourceType === 'REVENUE' || catName.includes('รายได้')) {
                        matrix[rowKey].revenue += amount;
                      } else if (sourceType === 'SUBSIDY' || catName.includes('อุดหนุน')) {
                        matrix[rowKey].subsidy += amount;
                      } else {
                        // Fallback based on project dynamic form data if applicable, or default
                        matrix[rowKey].gov += amount;
                      }
                    });

                    // Totals
                    const totalGov = matrix.compensation.gov + matrix.operating.gov + matrix.material.gov;
                    const totalRev = matrix.compensation.revenue + matrix.operating.revenue + matrix.material.revenue;
                    const totalSub = matrix.compensation.subsidy + matrix.operating.subsidy + matrix.material.subsidy;
                    const totalOth = matrix.compensation.other + matrix.operating.other + matrix.material.other;

                    return (
                      <>
                        {rows.map((r) => {
                          const data = matrix[r.key];
                          return (
                            <tr key={r.key} className="hover:bg-slate-50/70 transition">
                              <td className="px-4 py-2.5 text-left font-medium text-slate-800 border-r border-slate-100">
                                {r.label}
                              </td>
                              <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-700">
                                {data.gov > 0 ? data.gov.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                              </td>
                              <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-700">
                                {data.revenue > 0 ? data.revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                              </td>
                              <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-700">
                                {data.subsidy > 0 ? data.subsidy.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                              </td>
                              <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-700">
                                {data.other > 0 ? data.other.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-left text-slate-500">
                                {data.note || '-'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Summary Row */}
                        <tr className="bg-slate-50/90 font-bold border-t-2 border-slate-200">
                          <td className="px-4 py-3 text-center text-slate-900 border-r border-slate-200 font-bold">
                            รวมทั้งสิ้น
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-slate-900">
                            {totalGov > 0 ? totalGov.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-slate-900">
                            {totalRev > 0 ? totalRev.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-slate-900">
                            {totalSub > 0 ? totalSub.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200 font-mono text-slate-900">
                            {totalOth > 0 ? totalOth.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-emerald-800 bg-emerald-50/50 font-mono">
                            {Number(project.total_budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="space-y-4 mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">ข้อมูลตามแบบฟอร์ม</h3>
            
            {project.template?.tags?.filter((t: any) => !(t.options && typeof t.options === 'object' && !Array.isArray(t.options) && t.options.is_hidden)).map((tag: any) => {
              const value = parsedDynamicData[tag.tag_name];
              const label = tag.label || tag.tag_name;
              
              if (tag.tag_type === 'TABLE_LOOP') {
                 return (
                   <div key={tag.tag_name} className="mt-4">
                     <p className="text-slate-500 mb-2 text-xs font-semibold">{label}</p>
                     {Array.isArray(value) && value.length > 0 ? (
                       <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-slate-600 border border-slate-200">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                               <tr>
                                  {Object.keys(value[0]).filter(k => !k.endsWith('_check') && !k.endsWith('_bullet')).map(k => (
                                    <th key={k} className="px-3 py-2 border-r border-slate-200">{k}</th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               {value.map((row: any, i: number) => (
                                 <tr key={i} className="border-b border-slate-100 bg-white">
                                    {Object.keys(row).filter(k => !k.endsWith('_check') && !k.endsWith('_bullet')).map(k => (
                                      <td key={k} className="px-3 py-2 border-r border-slate-100">{row[k] === '/' ? '✓' : row[k]}</td>
                                    ))}
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                       </div>
                     ) : (
                       <p className="text-slate-800 text-xs bg-slate-50 p-3 rounded border border-slate-100">- ไม่มีข้อมูล -</p>
                     )}
                   </div>
                 );
              }

              if (tag.tag_type === 'DATE') {
                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {formatThaiDate(value)}
                     </div>
                   </div>
                 );
              }

              if (tag.tag_type === 'DATERANGE') {
                 const dVal = typeof value === 'object' && value !== null ? value : {};
                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {formatThaiDate(dVal.start)} <span className="text-slate-400 mx-2">ถึง</span> {formatThaiDate(dVal.end)}
                     </div>
                   </div>
                 );
              }

              if (tag.tag_type === 'TIMELINE') {
                 const months = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
                 return (
                   <div key={tag.tag_name} className="mt-4">
                     <p className="text-slate-500 mb-2 text-xs font-semibold">{label}</p>
                     {Array.isArray(value) && value.length > 0 ? (
                       <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-slate-600 border border-slate-200">
                            <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                               <tr>
                                  <th className="px-3 py-2 border-r border-slate-200 w-1/3">ขั้นตอนการดำเนินงาน</th>
                                  {months.map(m => (
                                    <th key={m} className="px-2 py-2 border-r border-slate-200 text-center font-normal">{m}</th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               {value.map((row: any, i: number) => {
                                 let stepName = row.step_name;
                                 if (!stepName) {
                                    const otherKeys = Object.keys(row).filter(k => !/^m\d+(?:_check|_bullet)?$/.test(k) && k !== 'id');
                                    stepName = otherKeys.length > 0 ? otherKeys[0] : `ขั้นตอนที่ ${i+1}`;
                                 }
                                 
                                 return (
                                 <tr key={i} className="border-b border-slate-100 bg-white">
                                    <td className="px-3 py-2 border-r border-slate-100">{stepName}</td>
                                    {Array.from({ length: 12 }).map((_, cIndex) => {
                                      const mKey = 'm' + (cIndex + 1);
                                      return (
                                        <td key={cIndex} className="px-2 py-2 border-r border-slate-100 text-center text-slate-800 font-bold">
                                          {row[mKey] === '/' ? '✓' : ''}
                                        </td>
                                      );
                                    })}
                                 </tr>
                                 );
                               })}
                            </tbody>
                         </table>
                       </div>
                     ) : (
                       <p className="text-slate-800 text-sm bg-slate-50 p-3 rounded border border-slate-100">- ไม่มีข้อมูล -</p>
                     )}
                   </div>
                 );
              }

              if (tag.tag_type === 'ALIGNMENT_CHECKLIST') {
                 const optionsList = Array.isArray(tag.options) ? tag.options : [];
                 const valObj = typeof value === 'object' && value !== null ? value : {};
                 const selectedLabels = optionsList.map((opt: any, idx: number) => {
                   const item = typeof opt === 'string' ? { key: `chk_${idx}`, label: opt } : opt;
                   return valObj[item.key] ? item.label : null;
                 }).filter(Boolean);

                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {selectedLabels.length > 0 ? (
                         <ul className="list-disc pl-4 space-y-1">
                           {selectedLabels.map((lbl: string, i: number) => <li key={i}>{lbl}</li>)}
                         </ul>
                       ) : (
                         <span className="text-slate-400">- ไม่มีการเลือกรายการ -</span>
                       )}
                     </div>
                   </div>
                 );
              }

              if (tag.tag_type === 'BOOLEAN') {
                 return (
                   <div key={tag.tag_name} className="mt-3 py-1 flex items-start gap-2.5">
                     <input 
                       type="checkbox" 
                       checked={!!value} 
                       readOnly
                       disabled
                       className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 opacity-80" 
                     />
                     <span className="text-sm font-semibold text-slate-700">{label}</span>
                   </div>
                 );
              }

              // Fallback safe rendering for any other unknown object
              let displayValue = value;
              if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value);
              }

              return (
                <div key={tag.tag_name} className="mt-3">
                  <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                  <div className="text-slate-800 text-sm whitespace-pre-wrap bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    {displayValue || '-'}
                  </div>
                </div>
              );
            })}
            
            {(!project.template?.tags || project.template.tags.length === 0) && (
               <div className="text-center py-4 text-slate-500 text-sm">
                 ไม่พบข้อมูลแบบฟอร์ม (อาจเป็นโครงการเก่าที่ไม่มีการตั้งค่า tag)
               </div>
            )}
          </div>
        </div>
      )}

      {/* Action Dialog / Modal */}
      {actionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {actionType === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {actionType === 'REVISE' && <RotateCcw className="w-5 h-5 text-amber-600" />}
                {actionType === 'REJECT' && <X className="w-5 h-5 text-rose-600" />}
                {actionType === 'APPROVE' && 'ยืนยันการอนุมัติ / เห็นชอบโครงการ'}
                {actionType === 'REVISE' && 'ส่งคำขอแก้ไขโครงการกลับไปยังผู้เสนอ'}
                {actionType === 'REJECT' && 'ยืนยันการปฏิเสธ / ไม่อนุมัติโครงการ'}
              </h3>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ข้อคิดเห็น / คำสั่งการพิจารณา:
              </label>

              {/* Quick Preset Chips */}
              <div className="space-y-1 mb-2">
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> ข้อความมาตรฐานด่วน (คลิกเลือก):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(actionType === 'APPROVE'
                    ? [
                        'เห็นชอบตามเสนอ สมควรดำเนินการ',
                        'สอดคล้องกับยุทธศาสตร์ประจำฝ่าย',
                        'ตรวจสอบงบประมาณถูกต้อง ออกรหัสโครงการเรียบร้อย',
                        'อนุมัติให้ดำเนินโครงการตามที่เสนอ',
                      ]
                    : actionType === 'REVISE'
                    ? [
                        'ขอให้ปรับปรุงรายละเอียดค่าใช้จ่ายในตารางงบประมาณเพิ่มเติม',
                        'ขอให้ระบุเป้าหมายเชิงปริมาณและคุณภาพให้ชัดเจนยิ่งขึ้น',
                        'ขอให้ปรับแก้กำหนดการและกิจกรรมตามกระบวนการ PDCA',
                      ]
                    : [
                        'ไม่อนุมัติ เนื่องจากงบประมาณไม่เพียงพอ',
                        'ไม่อนุมัติ เนื่องจากกิจกรรมไม่สอดคล้องกับยุทธศาสตร์หลัก',
                      ]
                  ).map((text, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setComment(text)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition text-left ${
                        comment === text
                          ? 'bg-blue-900 text-white border-blue-900 font-semibold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุข้อคิดเห็น เช่น เห็นควรดำเนินการตามเสนอ..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-sans leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setActionType(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApprovalAction}
                disabled={isProcessing}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : actionType === 'REVISE'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isProcessing ? 'กำลังประมวลผล...' : 'ยืนยันดำเนินการ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Summary Hub Modal (Booklet & One-Page) */}
      <ProjectSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        project={project}
      />
    </div>
  );
}