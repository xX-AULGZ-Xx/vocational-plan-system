'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { useNotifications } from '@/lib/notification-context';
import { showAlert } from '@/lib/sweetalert';
import A4DocumentPreview, { ProjectFormData } from '@/components/preview/A4DocumentPreview';
import ProjectSummaryModal from '@/components/reports/ProjectSummaryModal';
import ProjectSummaryTab from '@/components/reports/ProjectSummaryTab';
import EvaluationTab from '@/components/evaluation/EvaluationTab';
import ModalPortal from '@/components/ui/ModalPortal';
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
  Calendar,
  Plus,
  MapPin,
  PlayCircle,
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
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const { collegeName } = useSettings();
  const { subscribeDataUpdate } = useNotifications();
  const projectId = params?.id as string;

  const initialTab = (searchParams.get('tab') as any) || 'details';
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<number>(0.85);
  const [activeTab, setActiveTab] = useState<'details' | 'approvals' | 'attachments' | 'evaluation' | 'summary'>(
    ['details', 'approvals', 'attachments', 'evaluation', 'summary'].includes(initialTab) ? initialTab : 'details'
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['details', 'approvals', 'attachments', 'evaluation', 'summary'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

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

  // Document inline preview state
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // Approval action modal state
  const [actionType, setActionType] = useState<'APPROVE' | 'REVISE' | 'REJECT' | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Post-Approval Permitted Execution Dates Modal State
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<string>('permitted');
  const [executionDateItems, setExecutionDateItems] = useState<Array<{ start_date: string; end_date: string; title: string; location: string }>>([
    { start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], title: 'ดำเนินโครงการ', location: '' },
  ]);
  const [executionNote, setExecutionNote] = useState('');
  const [savingExecution, setSavingExecution] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId, token]);

  // Real-time Data Update Listener: Automatically refresh current project when updated or approved
  useEffect(() => {
    const unsubscribe = subscribeDataUpdate((event) => {
      if (
        (event.scope === 'PROJECTS' || event.scope === 'APPROVALS') &&
        (!event.projectId || event.projectId === projectId)
      ) {
        fetchProject();
      }
    });
    return () => unsubscribe();
  }, [subscribeDataUpdate, projectId, token]);

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

  const handleDeleteProject = async () => {
    if (!project) return;
    const isRejected = project.status === 'rejected';
    const confirmed = await showAlert.confirm(
      isRejected ? 'ยืนยันการลบโครงการ' : 'ยืนยันการลบแบบร่าง',
      `คุณต้องการลบโครงการ "${project.title}" ใช่หรือไม่? (การดำเนินการนี้ไม่สามารถย้อนกลับได้)`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await showAlert.success('ลบโครงการเรียบร้อยแล้ว');
        router.push('/my-projects');
      } else {
        showAlert.error('ลบไม่สำเร็จ', data.message);
      }
    } catch (err) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบโครงการ');
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
  const isRejected = project.status === 'rejected';
  const latestRevisionOrReject = [...(project.approvals || [])].reverse().find((a: any) => a.status === 'REVISION_REQUESTED' || a.status === 'REJECTED');
  const hasRevisionRequested = isDraft && latestRevisionOrReject?.status === 'REVISION_REQUESTED';
  const isOwnerOrAdmin = user && (user.id === project.leader?.id || user.role === 'ADMIN' || user.role === 'PLANNING_OFFICER' || user.role === 'HEAD_DEPT' || user.role === 'DEPUTY_DIRECTOR');
  const isAdmin = user?.role === 'ADMIN';

  // Check if project is completely approved or completed
  const isFinalApprovedOrCompleted =
    project.status === 'approved' ||
    project.status === 'in_progress' ||
    project.status === 'completed';

  const canEditProject = isOwnerOrAdmin && !isFinalApprovedOrCompleted;
  const canDeleteProject = !isFinalApprovedOrCompleted && (isAdmin || (user && user.id === project.leader?.id && (isDraft || isRejected)));
  const canUploadDoc = user && (user.id === project.leader?.id || user.role === 'ADMIN' || user.role === 'PLANNING_OFFICER');
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
              {(() => {
                const targetDivName = parsedDynamicData['approver_division_name'] || 
                                     (parsedDynamicData['approver_position']?.includes('บริหารทรัพยากร') || parsedDynamicData['endorser_position']?.includes('บริหารทรัพยากร') ? 'ฝ่ายบริหารทรัพยากร' : null) ||
                                     (parsedDynamicData['approver_position']?.includes('วิชาการ') || parsedDynamicData['endorser_position']?.includes('วิชาการ') ? 'ฝ่ายวิชาการ' : null) ||
                                     (parsedDynamicData['approver_position']?.includes('พัฒนากิจการ') || parsedDynamicData['endorser_position']?.includes('พัฒนากิจการ') ? 'ฝ่ายพัฒนากิจการนักเรียนฯ' : null) ||
                                     (parsedDynamicData['approver_position']?.includes('แผนงาน') || parsedDynamicData['endorser_position']?.includes('แผนงาน') ? 'ฝ่ายแผนงานและความร่วมมือ' : null) ||
                                     project.department?.division?.name;
                
                const deptName = parsedDynamicData['leader_department_name'] || project.department?.name;

                return (
                  <>
                    สังกัด: {deptName} {targetDivName ? `(${targetDivName})` : ''} • ผู้เสนอ: {project.leader?.full_name}
                  </>
                );
              })()}
            </p>
          </div>
        </div>

          {/* Approval Actions or Print or Project Summary */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Approved Project: One-Page Summary Button */}
            {project.status === 'approved' && (
              <button
                onClick={() => setShowSummaryModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-theme bg-gradient-to-r from-theme-primary via-indigo-900 to-theme-primary-hover hover:brightness-110 text-white shadow-sm transition"
                title="เปิดเอกสารสรุปผลโครงการแผ่นเดียว (One-Page Executive Summary)"
              >
                <FileText className="w-4 h-4 text-amber-300" />
                <span>สรุปผลโครงการ (แผ่นเดียว)</span>
              </button>
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

            {/* Edit Project Button (for Draft / Rejected / Revision) */}
            {canEditProject && (
              <Link
                href={`/projects/${project.id}/edit`}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition transform active:scale-95"
                title="แก้ไขข้อมูลโครงการ"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>แก้ไขโครงการ</span>
              </Link>
            )}

            {/* Delete Project Button (for Draft / Rejected) */}
            {canDeleteProject && (
              <button
                onClick={handleDeleteProject}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-sm transition transform active:scale-95"
                title="ลบโครงการ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบโครงการ</span>
              </button>
            )}

            {/* If Draft / Rejected / Revision: Submit for Approval Button */}
            {canEditProject && (
              <button
                onClick={handleSubmitProject}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white shadow-sm transition transform active:scale-95"
                title="ยื่นเสนอโครงการเข้าสู่กระบวนการพิจารณาและอนุมัติ"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'กำลังส่งโครงการ...' : (isRejected || hasRevisionRequested) ? 'ยื่นเสนอโครงการอีกครั้ง' : 'ยื่นเสนอขออนุมัติโครงการ'}</span>
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

        {/* Feedback banner if Rejected */}
        {isRejected && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start justify-between gap-3 shadow-xs no-print">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-800">โครงการนี้ไม่ผ่านการอนุมัติ (ถูกปฏิเสธ)</h4>
                <p className="text-rose-700 mt-0.5">
                  {(() => {
                    const latestRejected = [...(project.approvals || [])].reverse().find((a: any) => a.status === 'REJECTED');
                    if (latestRejected?.comment) {
                      return `เหตุผล: "${latestRejected.comment}"`;
                    }
                    return 'ท่านสามารถคลิก "แก้ไขโครงการ" เพื่อปรับปรุงข้อมูลและยื่นเสนอใหม่ หรือคลิก "ลบโครงการ" ได้';
                  })()}
                </p>
              </div>
            </div>
            {canEditProject && (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition"
                >
                  แก้ไขโครงการ
                </Link>
                {canDeleteProject && (
                  <button
                    onClick={handleDeleteProject}
                    className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition"
                  >
                    ลบโครงการ
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feedback banner if Revision Requested */}
        {hasRevisionRequested && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-3 shadow-xs no-print">
            <div className="flex items-start gap-2.5">
              <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-800">โครงการส่งกลับเพื่อขอให้ปรับปรุงแก้ไข</h4>
                <p className="text-amber-700 mt-0.5">
                  {(() => {
                    if (latestRevisionOrReject?.comment) {
                      return `ข้อเสนอแนะจากผู้อนุมัติ: "${latestRevisionOrReject.comment}"`;
                    }
                    return 'กรุณาคลิก "แก้ไขโครงการ" เพื่อปรับปรุงรายละเอียดตามที่ได้รับแจ้ง แล้วกดยื่นเสนอใหม่อีกครั้ง';
                  })()}
                </p>
              </div>
            </div>
            {canEditProject && (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition"
                >
                  แก้ไขโครงการ
                </Link>
                <button
                  onClick={handleSubmitProject}
                  disabled={submitting}
                  className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg text-xs transition"
                >
                  {submitting ? 'กำลังส่ง...' : 'ยื่นเสนอใหม่'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Post-Approval Execution Stages Tracker & Planning Officer Control */}
        {['approved', 'in_progress', 'completed'].includes(project.status) && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-800">สถานะการดำเนินงานโครงการ (หลัง ผอ. อนุมัติ):</span>
                {(() => {
                  const sub = parsedDynamicData?.execution_sub_status || (project.status === 'completed' ? 'completed' : project.status === 'in_progress' ? 'in_progress' : 'approved');
                  if (sub === 'approved') {
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ๑. อนุมัติโครงการ
                      </span>
                    );
                  }
                  if (sub === 'permitted') {
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        ๒. อนุญาตดำเนินโครงการ
                      </span>
                    );
                  }
                  if (sub === 'in_progress') {
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        ๓. ดำเนินโครงการ
                      </span>
                    );
                  }
                  return (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                      ๔. สรุปผลโครงการ
                    </span>
                  );
                })()}
              </div>

              {parsedDynamicData?.execution_status_updated_at && (
                <span className="text-[11px] text-slate-400">
                  อัปเดตล่าสุด: {formatThaiDate(parsedDynamicData.execution_status_updated_at)} โดย {parsedDynamicData.execution_status_updated_by || 'งานแผนงาน'}
                </span>
              )}
            </div>

            {/* Stage Stepper Display */}
            {(() => {
              const sub = parsedDynamicData?.execution_sub_status || (project.status === 'completed' ? 'completed' : project.status === 'in_progress' ? 'in_progress' : 'approved');
              const stages = [
                { id: 'approved', label: 'อนุมัติโครงการ', num: 1 },
                { id: 'permitted', label: 'อนุญาตดำเนินโครงการ', num: 2 },
                { id: 'in_progress', label: 'ดำเนินโครงการ', num: 3 },
                { id: 'completed', label: 'สรุปผลโครงการ', num: 4 },
              ];
              const getIndex = (s: string) => stages.findIndex(x => x.id === s);
              const currentIdx = getIndex(sub);

              const isPlanner = user && ['PLANNING_OFFICER', 'ADMIN', 'DIRECTOR'].includes(user.role);

              return (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                    {stages.map((st, i) => {
                      const isCurrent = st.id === sub;
                      const isPassed = i <= currentIdx;
                      return (
                        <div
                          key={st.id}
                          className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition ${
                            isCurrent
                              ? 'bg-theme-primary text-white border-theme-primary font-bold shadow-xs'
                              : isPassed
                              ? 'bg-slate-50 text-slate-700 border-slate-200 font-medium'
                              : 'bg-white text-slate-400 border-dashed border-slate-200'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrent ? 'bg-white text-theme-primary' : isPassed ? 'bg-theme-primary text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {st.num}
                          </span>
                          <span className="truncate">{st.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Planning Officer Quick Status Update Action Buttons */}
                  {isPlanner && (
                    <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">ปรับสถานะ:</span>
                      {stages.map(st => (
                        <button
                          key={st.id}
                          onClick={async () => {
                            if (st.id === 'permitted' || st.id === 'in_progress') {
                              // Open Execution Dates configuration modal
                              setPendingTargetStatus(st.id);
                              // Populate existing dates from parsedDynamicData or project timelines
                              let initialDates: Array<{ start_date: string; end_date: string; title: string; location: string }> = [];
                              if (Array.isArray(parsedDynamicData?.execution_dates) && parsedDynamicData.execution_dates.length > 0) {
                                initialDates = parsedDynamicData.execution_dates.map((d: any) => ({
                                  start_date: d.start_date || d.startDate || new Date().toISOString().split('T')[0],
                                  end_date: d.end_date || d.endDate || d.start_date || new Date().toISOString().split('T')[0],
                                  title: d.title || d.activity_name || 'ดำเนินโครงการ',
                                  location: d.location || '',
                                }));
                              } else if (Array.isArray(project.timelines) && project.timelines.length > 0) {
                                initialDates = project.timelines.map((t: any) => ({
                                  start_date: typeof t.start_date === 'string' ? t.start_date.split('T')[0] : new Date(t.start_date).toISOString().split('T')[0],
                                  end_date: typeof t.end_date === 'string' ? t.end_date.split('T')[0] : new Date(t.end_date).toISOString().split('T')[0],
                                  title: t.activity_name || 'ดำเนินโครงการ',
                                  location: t.location || '',
                                }));
                              } else {
                                initialDates = [{ start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], title: 'ดำเนินโครงการ', location: '' }];
                              }
                              setExecutionDateItems(initialDates);
                              setExecutionNote(parsedDynamicData?.execution_status_note || '');
                              setShowExecutionModal(true);
                              return;
                            }

                            // For other statuses (approved / completed), direct submit
                            try {
                              const res = await fetch(`/api/v1/projects/${project.id}/execution-status`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ execution_status: st.id }),
                              });
                              const data = await res.json();
                              if (!data.success) throw new Error(data.message);
                              setActionMsg(data.message);
                              fetchProject();
                            } catch (err: any) {
                              setActionMsg(err.message || 'เกิดข้อผิดพลาด');
                            }
                          }}
                          disabled={sub === st.id}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            sub === st.id
                              ? 'bg-slate-200 text-slate-400 cursor-default'
                              : st.id === 'permitted'
                              ? 'bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 font-bold'
                              : 'bg-slate-100 hover:bg-theme-primary hover:text-white text-slate-700 border border-slate-200'
                          }`}
                          title={`เปลี่ยนสถานะเป็น ${st.label}`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Display Configured Execution Dates (If any) */}
            {Array.isArray(parsedDynamicData?.execution_dates) && parsedDynamicData.execution_dates.length > 0 && (
              <div className="pt-2 border-t border-slate-100 mt-2 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>กำหนดการดำเนินโครงการที่ได้รับอนุญาต (ซิงค์เข้าปฏิทินแล้ว):</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                    {parsedDynamicData.execution_dates.map((item: any, idx: number) => (
                      <span key={idx} className="bg-white px-2.5 py-1 rounded-md border border-indigo-200 font-medium shadow-2xs inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                        <span className="font-bold text-indigo-900">{item.title || `ช่วงที่ ${idx + 1}`}:</span>
                        <span>{formatThaiDate(item.start_date)} - {formatThaiDate(item.end_date)}</span>
                        {item.location && <span className="text-slate-500 font-normal">({item.location})</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {user && ['PLANNING_OFFICER', 'ADMIN', 'DIRECTOR'].includes(user.role) && (
                  <button
                    onClick={() => {
                      setPendingTargetStatus(parsedDynamicData?.execution_sub_status || 'permitted');
                      setExecutionDateItems(
                        parsedDynamicData.execution_dates.map((d: any) => ({
                          start_date: d.start_date || new Date().toISOString().split('T')[0],
                          end_date: d.end_date || d.start_date || new Date().toISOString().split('T')[0],
                          title: d.title || 'ดำเนินโครงการ',
                          location: d.location || '',
                        }))
                      );
                      setExecutionNote(parsedDynamicData?.execution_status_note || '');
                      setShowExecutionModal(true);
                    }}
                    className="px-3 py-1 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-800 text-xs font-bold rounded-lg transition shrink-0 shadow-2xs"
                  >
                    ✏️ แก้ไขวันดำเนินโครงการ
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {actionMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-theme text-xs font-medium no-print">
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
        <div className="bg-white p-6 rounded-theme border border-slate-200 shadow-xs no-print space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-theme-primary" />
                <span>ไฟล์แนบและเอกสารสแกน ({project.documents?.length || 0} รายการ)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                รองรับไฟล์ PDF, รูปภาพ (PNG, JPG), และเอกสาร Word (DOCX) สำหรับบันทึกข้อความหรือหลักฐานประกอบโครงการ
              </p>
            </div>

            {canUploadDoc && (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleDocUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc"
                  className="hidden"
                  id="detail-doc-upload"
                  disabled={uploadingDoc}
                />
                <label
                  htmlFor="detail-doc-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-theme cursor-pointer shadow-sm transition ${
                    uploadingDoc ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                  }`}
                >
                  {uploadingDoc ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังอัปโหลดไฟล์...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>แนบไฟล์เอกสารใหม่</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          {docUploadMsg && (
            <div
              className={`p-3 rounded-theme text-xs font-medium flex items-center justify-between ${
                docUploadMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {docUploadMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{docUploadMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setDocUploadMsg(null)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {project.documents?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {project.documents.map((doc: any) => {
                const ext = (doc.file_type || '').toLowerCase();
                const isPdf = ext === 'pdf';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                const isDocx = ['doc', 'docx'].includes(ext);

                return (
                  <div
                    key={doc.id}
                    className="group bg-white border border-slate-200 rounded-theme hover:border-theme-primary hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-theme flex items-center justify-center shrink-0 ${
                        isPdf
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : isImage
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : isDocx
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {isPdf ? (
                          <FileText className="w-5 h-5" />
                        ) : isImage ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <Paperclip className="w-5 h-5" />
                        )}
                      </div>

                      <div className="overflow-hidden flex-1">
                        <p className="font-bold text-xs text-slate-800 line-clamp-2 group-hover:text-theme-primary transition" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {doc.file_type || 'FILE'}
                          </span>
                          <span>{new Date(doc.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Preview, Download, Delete */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        {/* Preview button for PDF and Images */}
                        {(isPdf || isImage) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-theme-primary hover:text-white text-slate-700 font-bold text-[11px] rounded transition"
                            title="ดูตัวอย่างไฟล์ในหน้าเว็บ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูตัวอย่าง</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">ไฟล์เอกสารดาวน์โหลด</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={`/api/v1/projects/documents/${doc.id}/download`}
                          download
                          className="p-1.5 text-slate-600 hover:text-theme-primary hover:bg-slate-100 rounded transition"
                          title="ดาวน์โหลดไฟล์"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {canUploadDoc && (
                          <button
                            type="button"
                            onClick={() => handleDocDelete(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="ลบไฟล์"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-theme bg-slate-50/50 space-y-2">
              <Paperclip className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">ยังไม่มีไฟล์สแกนหรือเอกสารแนบในโครงการนี้</p>
              <p className="text-[11px] text-slate-400">ท่านสามารถคลิกปุ่ม "แนบไฟล์เอกสารใหม่" ด้านบนเพื่อเพิ่มเอกสารประกอบ</p>
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
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
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
        </ModalPortal>
      )}

      {/* Project Summary Hub Modal (Booklet & One-Page) */}
      <ProjectSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        project={project}
      />

      {/* Document Inline Preview Modal (PDF & Images) */}
      {previewDoc && (
        <ModalPortal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-theme-primary-light text-theme-primary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-slate-800 truncate" title={previewDoc.file_name}>
                      {previewDoc.file_name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      ประเภท: {previewDoc.file_type?.toUpperCase()} • วันที่แนบ: {new Date(previewDoc.created_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/v1/projects/documents/${previewDoc.id}/download`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-primary text-white text-xs font-bold rounded-theme hover:bg-theme-primary-hover shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Render PDF in iframe or Image */}
              <div className="flex-1 bg-slate-100 p-2 overflow-auto flex items-center justify-center">
                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes((previewDoc.file_type || '').toLowerCase()) ? (
                  <div className="max-w-full max-h-full p-4 flex items-center justify-center">
                    <img
                      src={`/api/v1/projects/documents/${previewDoc.id}/view`}
                      alt={previewDoc.file_name}
                      className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                    />
                  </div>
                ) : (
                  <iframe
                    src={`/api/v1/projects/documents/${previewDoc.id}/view`}
                    className="w-full h-full rounded-lg border border-slate-200 bg-white"
                    title={previewDoc.file_name}
                  />
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Post-Approval Execution Dates (Multiple Dates / Ranges) Modal */}
      {showExecutionModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-900 to-blue-900 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10 text-white shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {pendingTargetStatus === 'permitted' ? '๒. อนุญาตดำเนินโครงการ - กำหนดวันดำเนินงาน' : 'กำหนดวันดำเนินงานโครงการ'}
                    </h3>
                    <p className="text-xs text-blue-100/90">
                      ระบุวันที่สำหรับการดำเนินโครงการ (รองรับหลายวัน/หลายช่วง) ข้อมูลจะถูกนำไปเพิ่มลงในปฏิทินของระบบโดยอัตโนมัติ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExecutionModal(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-blue-950">
                  <PlayCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">โครงการ: </span>
                    <span>{project.title}</span>
                    {project.project_code && (
                      <span className="ml-2 font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {project.project_code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Multiple Execution Dates Input List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>วันที่ดำเนินโครงการ (Execution Dates):</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setExecutionDateItems((prev) => [
                          ...prev,
                          {
                            start_date: new Date().toISOString().split('T')[0],
                            end_date: new Date().toISOString().split('T')[0],
                            title: `ดำเนินโครงการ (ช่วงที่ ${prev.length + 1})`,
                            location: '',
                          },
                        ]);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มช่วงวันดำเนินงาน</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {executionDateItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700">ช่วงที่ {idx + 1}</span>
                          {executionDateItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setExecutionDateItems((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ลบช่วงนี้</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              วันที่เริ่มต้น:
                            </label>
                            <input
                              type="date"
                              value={item.start_date}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExecutionDateItems((prev) =>
                                  prev.map((d, i) =>
                                    i === idx
                                      ? { ...d, start_date: val, end_date: d.end_date < val ? val : d.end_date }
                                      : d
                                  )
                                );
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              วันที่สิ้นสุด:
                            </label>
                            <input
                              type="date"
                              value={item.end_date}
                              min={item.start_date}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExecutionDateItems((prev) =>
                                  prev.map((d, i) => (i === idx ? { ...d, end_date: val } : d))
                                );
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              ชื่อกิจกรรม / รายละเอียดช่วงนี้ (แสดงในปฏิทิน):
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExecutionDateItems((prev) =>
                                  prev.map((d, i) => (i === idx ? { ...d, title: val } : d))
                                );
                              }}
                              placeholder="เช่น จัดอบรมเชิงปฏิบัติการ, จัดกิจกรรมภาคสนาม"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              สถานที่ดำเนินงาน:
                            </label>
                            <input
                              type="text"
                              value={item.location}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExecutionDateItems((prev) =>
                                  prev.map((d, i) => (i === idx ? { ...d, location: val } : d))
                                );
                              }}
                              placeholder="เช่น หอประชุมวิทยาลัย, ห้องประชุม 1"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    หมายเหตุ / ข้อความเพิ่มเติมจากงานแผนงาน:
                  </label>
                  <textarea
                    rows={2}
                    value={executionNote}
                    onChange={(e) => setExecutionNote(e.target.value)}
                    placeholder="ระบุข้อกำหนด เงื่อนไข หรือข้อความแจ้งเตือนถึงผู้รับผิดชอบโครงการ..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowExecutionModal(false)}
                  disabled={savingExecution}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setSavingExecution(true);
                    try {
                      const res = await fetch(`/api/v1/projects/${project.id}/execution-status`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          execution_status: pendingTargetStatus,
                          execution_dates: executionDateItems,
                          note: executionNote.trim() || undefined,
                        }),
                      });

                      const data = await res.json();
                      if (!data.success) throw new Error(data.message);

                      setShowExecutionModal(false);
                      setActionMsg(data.message || 'บันทึกวันดำเนินโครงการและซิงค์เข้าปฏิทินเรียบร้อยแล้ว');
                      showAlert.success('สำเร็จ', 'บันทึกกำหนดการดำเนินโครงการและนำเข้าสู่ปฏิทินกิจกรรมเรียบร้อยแล้ว');
                      fetchProject();
                    } catch (err: any) {
                      showAlert.error('ผิดพลาด', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                    } finally {
                      setSavingExecution(false);
                    }
                  }}
                  disabled={savingExecution}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{savingExecution ? 'กำลังบันทึกและนำเข้าปฏิทิน...' : 'บันทึกสถานะ & เพิ่มลงปฏิทิน'}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}