'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ModalPortal from '@/components/ui/ModalPortal';
import { formatThaiBaht } from '@/lib/bahttext';
import {
  X,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Paperclip,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  User,
  Building,
  Target,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Award,
  Compass,
  MapPin,
  ListOrdered,
  History,
  Info,
  CheckCircle,
  XCircle,
  Printer,
  FileSpreadsheet
} from 'lucide-react';

interface ProjectQuickPreviewModalProps {
  project: any;
  approvalStep?: number;
  onClose: () => void;
  onActionClick?: (action: 'APPROVE' | 'REVISE' | 'REJECT') => void;
  readOnly?: boolean;
}

export default function ProjectQuickPreviewModal({
  project,
  approvalStep,
  onClose,
  onActionClick,
  readOnly = false,
}: ProjectQuickPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'alignments' | 'budget' | 'timeline' | 'docs' | 'history'>('overview');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!project) return null;

  // Parse dynamic_data
  let dynamicData: Record<string, any> = {};
  if (typeof project.dynamic_data === 'string') {
    try {
      dynamicData = JSON.parse(project.dynamic_data);
    } catch {
      dynamicData = {};
    }
  } else if (typeof project.dynamic_data === 'object' && project.dynamic_data !== null) {
    dynamicData = project.dynamic_data;
  }

  // Parse objectives
  let objectivesList: string[] = [];
  if (Array.isArray(project.objectives)) {
    objectivesList = project.objectives.map((o: any) =>
      typeof o === 'object' && o !== null ? (o.title || o.name || o.item || JSON.stringify(o)) : String(o)
    );
  } else if (typeof project.objectives === 'string') {
    try {
      const parsed = JSON.parse(project.objectives);
      if (Array.isArray(parsed)) {
        objectivesList = parsed.map((o: any) =>
          typeof o === 'object' && o !== null ? (o.title || o.name || o.item || JSON.stringify(o)) : String(o)
        );
      } else {
        objectivesList = [project.objectives];
      }
    } catch {
      objectivesList = [project.objectives];
    }
  }

  // Parse target_groups
  let targetGroups: { quantitative?: string; qualitative?: string } = {};
  if (typeof project.target_groups === 'string') {
    try {
      targetGroups = JSON.parse(project.target_groups);
    } catch {
      targetGroups = { quantitative: project.target_groups };
    }
  } else if (typeof project.target_groups === 'object' && project.target_groups !== null) {
    targetGroups = project.target_groups;
  }

  const formatThaiDate = (dateStr: string | Date | null, includeTime = false) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const dateFormatted = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
    if (includeTime) {
      return `${dateFormatted} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
    }
    return dateFormatted;
  };

  const handleCopyCode = () => {
    if (project.project_code) {
      navigator.clipboard.writeText(project.project_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const totalBudget = Number(project.total_budget || 0);
  const bahtTextString = totalBudget > 0 ? formatThaiBaht(totalBudget) : 'ศูนย์บาทถ้วน';

  // Group budget items by category for summary
  const budgetByCategory = (project.budget_items || []).reduce((acc: Record<string, number>, item: any) => {
    const catName = item.category?.name || 'หมวดทั่วไป';
    const amount = Number(item.total_amount || 0);
    acc[catName] = (acc[catName] || 0) + amount;
    return acc;
  }, {});

  // 4 Approval Steps definition
  const standardSteps = [
    { step: 1, name: 'หัวหน้าแผนกวิชา / งาน', roleDesc: 'เห็นชอบขั้นต้น' },
    { step: 2, name: 'รองผู้อำนวยการประจำฝ่าย', roleDesc: 'พิจารณากลั่นกรอง' },
    { step: 3, name: 'งานวางแผนและงบประมาณ', roleDesc: 'ตรวจงบประมาณ & ออกรหัสโครงการ' },
    { step: 4, name: 'ผู้อำนวยการสถานศึกษา', roleDesc: 'อนุมัติโครงการ' },
  ];

  // Alignments list
  const alignments = project.alignments || [];

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 overflow-hidden my-auto">
          
          {/* ======================================================== */}
          {/* MODAL HEADER */}
          {/* ======================================================== */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-3 shrink-0 border-b border-white/10">
            <div className="space-y-2 flex-1 min-w-0 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {approvalStep ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[11px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>รอการพิจารณาขั้นที่ {approvalStep}</span>
                  </span>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    project.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : project.status === 'pending_approval'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : project.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                      : 'bg-slate-500/20 text-slate-300 border-slate-400/40'
                  }`}>
                    สถานะ: {project.status === 'approved' ? 'อนุมัติแล้ว' : project.status === 'pending_approval' ? 'รอการพิจารณา' : project.status === 'rejected' ? 'ไม่อนุมัติ' : project.status}
                  </span>
                )}

                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold">
                  ปีงบประมาณ {project.fiscal_year}
                </span>

                {project.project_code ? (
                  <button
                    onClick={handleCopyCode}
                    title="คลิกเพื่อคัดลอกรหัสโครงการ"
                    className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[11px] font-mono font-bold flex items-center gap-1 transition"
                  >
                    <span>{project.project_code}</span>
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-70" />}
                  </button>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px]">
                    ยังไม่ออกรหัสโครงการ (ออกในขั้นที่ ๓)
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-xl font-black text-white leading-snug tracking-tight line-clamp-2">
                {project.title}
              </h2>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-300 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-white font-medium">{project.department?.name || '-'}</span>
                  <span className="text-slate-400">({project.department?.division?.name || 'ฝ่ายวิชาการ'})</span>
                </span>
                <span className="hidden sm:inline text-slate-500">•</span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-300">ผู้รับผิดชอบ:</span>
                  <span className="text-white font-medium">{project.leader?.full_name || '-'}</span>
                  <span className="text-slate-400">({project.leader?.position || 'ครู'})</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
              <Link
                href={`/projects/${project.id}`}
                target="_blank"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
                title="เปิดดูรายละเอียดโครงการในแท็บใหม่"
              >
                <span>เปิดหน้าเต็ม</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
              </Link>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4-STEP APPROVAL WORKFLOW PROGRESS BAR */}
          {/* ======================================================== */}
          <div className="bg-slate-900 text-white px-3 sm:px-5 py-3 border-b border-slate-800 shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {standardSteps.map((s) => {
                const approvalRecord = (project.approvals || []).find((a: any) => a.step_order === s.step);
                const isApproved = approvalRecord?.status === 'APPROVED';
                const isRevision = approvalRecord?.status === 'REVISION_REQUESTED';
                const isRejected = approvalRecord?.status === 'REJECTED';
                const isCurrent = approvalStep === s.step || (approvalRecord?.status === 'PENDING');
                const isPending = !approvalRecord || approvalRecord.status === 'PENDING';

                return (
                  <div
                    key={s.step}
                    className={`p-2 sm:p-2.5 rounded-xl border text-xs transition flex flex-col justify-between ${
                      isApproved
                        ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200'
                        : isRevision
                        ? 'bg-amber-950/40 border-amber-700/50 text-amber-200'
                        : isRejected
                        ? 'bg-rose-950/40 border-rose-700/50 text-rose-200'
                        : isCurrent
                        ? 'bg-blue-900/60 border-blue-400 text-blue-100 ring-1 ring-blue-400/40 shadow-sm'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-[11px] truncate">
                        ขั้นที่ {s.step}
                      </span>
                      {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {isRevision && <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {isCurrent && !isApproved && !isRevision && !isRejected && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      )}
                    </div>
                    <p className="font-bold text-[11px] truncate text-white">{s.name}</p>
                    <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="truncate">
                        {approvalRecord?.approver?.full_name ? approvalRecord.approver.full_name : s.roleDesc}
                      </span>
                      {approvalRecord?.signed_at && (
                        <span className="text-slate-400 shrink-0 ml-1">
                          {formatThaiDate(approvalRecord.signed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* NAVIGATION TABS */}
          {/* ======================================================== */}
          <div className="bg-slate-100 px-3 sm:px-5 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap shrink-0">
            {[
              { id: 'overview', label: 'ภาพรวม & สาระสำคัญ', icon: FileText },
              { id: 'alignments', label: `ยุทธศาสตร์ (${alignments.length})`, icon: Compass },
              { id: 'budget', label: `งบประมาณ (${totalBudget.toLocaleString('th-TH')} บ.)`, icon: DollarSign },
              { id: 'timeline', label: `กำหนดการ (${project.timelines?.length || 0})`, icon: Calendar },
              { id: 'docs', label: `เอกสารแนบ (${project.documents?.length || 0})`, icon: Paperclip },
              { id: 'history', label: `ประวัติการพิจารณา (${project.approvals?.length || 0})`, icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* MODAL BODY CONTENT */}
          {/* ======================================================== */}
          <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5 text-slate-800 text-xs sm:text-sm bg-slate-50/40">
            
            {/* -------------------------------------------------------- */}
            {/* TAB: OVERVIEW */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                
                {/* Highlights Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-xl shadow-xs space-y-1">
                    <span className="text-[11px] text-blue-200 font-medium">งบประมาณรวมทั้งสิ้น</span>
                    <p className="text-lg sm:text-xl font-black">{totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                    <p className="text-[10px] text-blue-200/90 font-medium truncate">({bahtTextString})</p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-blue-600" /> หน่วยงานเสนอโครงการ
                    </span>
                    <p className="text-xs font-bold text-slate-900 truncate">{project.department?.name || '-'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{project.department?.division?.name || 'ฝ่ายวิชาการ'}</p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" /> ช่วงเวลาดำเนินงาน
                    </span>
                    <p className="text-xs font-bold text-slate-900">
                      {project.timelines && project.timelines.length > 0
                        ? `${formatThaiDate(project.timelines[0].start_date)} - ${formatThaiDate(project.timelines[project.timelines.length - 1].end_date)}`
                        : dynamicData.operation_dates || 'ตามแผนปฏิบัติราชการประจำปี'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      รวม {project.timelines?.length || 0} กิจกรรมย่อย
                    </p>
                  </div>
                </div>

                {/* Background & Rationale */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-blue-950">
                    <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                    <span>๑. หลักการและเหตุผล</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs pl-6">
                    {project.background || 'ไม่มีการระบุหลักการและเหตุผล'}
                  </p>
                </div>

                {/* Objectives */}
                <div className="p-4 bg-white border border-blue-100 rounded-xl shadow-2xs space-y-2.5">
                  <h4 className="font-bold text-blue-950 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <Target className="w-4 h-4 text-blue-900 shrink-0" />
                    <span>๒. วัตถุประสงค์ของโครงการ</span>
                  </h4>
                  {objectivesList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic pl-6">ไม่ระบุวัตถุประสงค์</p>
                  ) : (
                    <div className="space-y-2 pl-6">
                      {objectivesList.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-slate-800">
                          <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-2xs">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed font-medium">{obj}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Targets (Quantitative & Qualitative) */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-blue-950">
                    <Award className="w-4 h-4 text-indigo-700 shrink-0" />
                    <span>๓. เป้าหมายของโครงการ (Targets)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span> เป้าหมายเชิงปริมาณ
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                        {targetGroups.quantitative || dynamicData.target_quantitative || 'ไม่ระบุเป้าหมายเชิงปริมาณ'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span> เป้าหมายเชิงคุณภาพ
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                        {targetGroups.qualitative || dynamicData.target_qualitative || 'ไม่ระบุเป้าหมายเชิงคุณภาพ'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expected Results */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-blue-950">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>๔. ประโยชน์และผลที่คาดว่าจะได้รับ</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs pl-6">
                    {project.expected_results || dynamicData.expected_results || 'ไม่ระบุผลที่คาดว่าจะได้รับ'}
                  </p>
                </div>

                {/* Additional Dynamic Data Context */}
                {(dynamicData.location || dynamicData.target_count || dynamicData.participants || dynamicData.endorser_name || dynamicData.project_place) && (
                  <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-600">
                      <Info className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>๕. ข้อมูลบริบทและสถานที่ดำเนินการ</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pl-6">
                      {dynamicData.location && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">สถานที่จัดกิจกรรม</span>
                          <span className="text-xs font-semibold text-slate-800">{dynamicData.location}</span>
                        </div>
                      )}
                      {dynamicData.project_place && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">สถานที่ดำเนินการ</span>
                          <span className="text-xs font-semibold text-slate-800">{dynamicData.project_place}</span>
                        </div>
                      )}
                      {dynamicData.target_count && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">จำนวนผู้เข้าร่วม</span>
                          <span className="text-xs font-semibold text-slate-800">{dynamicData.target_count} คน</span>
                        </div>
                      )}
                      {dynamicData.participants && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">กลุ่มเป้าหมายผู้เข้าร่วม</span>
                          <span className="text-xs font-semibold text-slate-800">{dynamicData.participants}</span>
                        </div>
                      )}
                      {dynamicData.endorser_name && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">รอง ผอ. ผู้กำกับดูแล</span>
                          <span className="text-xs font-semibold text-slate-800">{dynamicData.endorser_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB: STRATEGIC ALIGNMENTS */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'alignments' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 text-blue-950">
                    <Compass className="w-4 h-4 text-blue-900" />
                    <span>ความสอดคล้องกับยุทธศาสตร์และแผนพัฒนาสถานศึกษา</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    โครงการนี้เชื่อมโยงกับยุทธศาสตร์ พันธกิจ และตัวชี้วัดความสำเร็จของสถานศึกษา
                  </p>
                </div>

                {alignments.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
                    <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-semibold text-xs">ไม่ได้ระบุความเชื่อมโยงกับตัวชี้วัดยุทธศาสตร์ในระบบ</p>
                    <p className="text-[11px] text-slate-400">ผู้เสนอโครงการสามารถระบุเพิ่มเติมได้ในการแก้ไขโครงการ</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {alignments.map((a: any, idx: number) => {
                      const ind = a.indicator;
                      const plan = ind?.plan;
                      return (
                        <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold">
                              {ind?.code || `ตัวชี้วัดที่ ${idx + 1}`}
                            </span>
                            {plan && (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {plan.title} (ปี {plan.fiscal_year})
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                            {ind?.description || ind?.name || 'ไม่มีรายละเอียดตัวชี้วัด'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB: BUDGET */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'budget' && (
              <div className="space-y-4">
                
                {/* Budget Summary Card */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-blue-200 font-medium">งบประมาณรวมทั้งสิ้นตามรายการ</p>
                    <p className="text-xl sm:text-2xl font-black">{totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                    <p className="text-xs text-blue-200 font-medium">({bahtTextString})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold">
                      {project.budget_items?.length || 0} รายการค่าใช้จ่าย
                    </div>
                  </div>
                </div>

                {/* Category Breakdown Badges */}
                {Object.keys(budgetByCategory).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {Object.entries(budgetByCategory).map(([catName, amount]) => (
                      <div key={catName} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-bold block truncate">{catName}</span>
                        <span className="text-xs font-bold text-blue-950 font-mono">
                          {Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Budget Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                          <th className="py-2.5 px-3">รายการค่าใช้จ่าย</th>
                          <th className="py-2.5 px-3">หมวดงบประมาณ</th>
                          <th className="py-2.5 px-3 text-right">จำนวน</th>
                          <th className="py-2.5 px-3 text-center">หน่วย</th>
                          <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                          <th className="py-2.5 px-3 text-right">รวมเป็นเงิน (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(project.budget_items || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400">
                              ไม่มีรายการค่าใช้จ่าย
                            </td>
                          </tr>
                        ) : (
                          project.budget_items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{item.description}</td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                                  {item.category?.name || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">{Number(item.quantity).toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-center text-slate-500">{item.unit}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-950">
                                {Number(item.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 border-t border-slate-200 font-bold text-slate-900">
                          <td colSpan={6} className="py-3 px-3 text-right text-xs">
                            รวมงบประมาณทั้งสิ้น:
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm text-blue-900 font-black">
                            {totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB: TIMELINE & PDCA */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-900" />
                    <span>กำหนดการและกิจกรรมตามกระบวนการ PDCA ({project.timelines?.length || 0} กิจกรรม)</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {(project.timelines || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                      ไม่มีกำหนดการกิจกรรมที่ระบุ
                    </div>
                  ) : (
                    project.timelines.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{t.activity_name}</p>
                            {t.location && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                <span>สถานที่: {t.location}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 pl-10 sm:pl-0">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 inline-block font-mono">
                            {formatThaiDate(t.start_date)} - {formatThaiDate(t.end_date)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB: DOCUMENTS & ATTACHMENTS */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'docs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-blue-900" />
                    <span>ไฟล์เอกสารประกอบโครงการ ({project.documents?.length || 0} ไฟล์)</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {(project.documents || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs space-y-1">
                      <Paperclip className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>ไม่มีไฟล์เอกสารแนบในระบบ</p>
                    </div>
                  ) : (
                    project.documents.map((doc: any) => (
                      <div key={doc.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition">
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-900 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-900 text-xs truncate">{doc.file_name}</p>
                            <p className="text-[10px] text-slate-400">อัปโหลดเมื่อ {formatThaiDate(doc.created_at, true)}</p>
                          </div>
                        </div>
                        <a
                          href={`/api/v1/projects/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shrink-0 transition"
                        >
                          ดาวน์โหลด
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* TAB: APPROVALS HISTORY AUDIT LOG */}
            {/* -------------------------------------------------------- */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-900" />
                  <span>บันทึกประวัติการพิจารณาและข้อคิดเห็นของผู้อนุมัติ</span>
                </h4>

                <div className="space-y-3">
                  {(!project.approvals || project.approvals.length === 0) ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                      ยังไม่มีบันทึกประวัติการพิจารณา
                    </div>
                  ) : (
                    project.approvals.map((appr: any, idx: number) => {
                      const isApproved = appr.status === 'APPROVED';
                      const isRevision = appr.status === 'REVISION_REQUESTED';
                      const isRejected = appr.status === 'REJECTED';
                      const isPending = appr.status === 'PENDING';

                      return (
                        <div
                          key={appr.id || idx}
                          className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-900 text-white text-[11px] font-bold">
                                ขั้นที่ {appr.step_order}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {appr.approver?.full_name ? `${appr.approver.full_name} (${appr.approver.position || appr.approver.role})` : 'รอการกำหนดผู้พิจารณา'}
                              </span>
                            </div>

                            <div>
                              {isApproved && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> อนุมัติเห็นชอบ
                                </span>
                              )}
                              {isRevision && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> ส่งคำขอแก้ไข
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                  <X className="w-3.5 h-3.5 text-rose-600" /> ไม่อนุมัติ
                                </span>
                              )}
                              {isPending && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" /> รอพิจารณา
                                </span>
                              )}
                            </div>
                          </div>

                          {appr.signed_at && (
                            <p className="text-[11px] text-slate-400">
                              ลงนามเมื่อ {formatThaiDate(appr.signed_at, true)}
                            </p>
                          )}

                          {appr.comment && (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 italic">
                              <span className="font-bold not-italic text-slate-600 mr-1.5">ข้อคิดเห็น / คำสั่งการ:</span>
                              "{appr.comment}"
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ======================================================== */}
          {/* MODAL ACTION FOOTER */}
          {/* ======================================================== */}
          <div className="bg-white p-3.5 sm:p-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition text-center"
              >
                ปิดหน้าต่าง
              </button>
              <Link
                href={`/projects/${project.id}`}
                target="_blank"
                className="px-3 py-2 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 transition flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>เปิดดูฉบับเต็ม</span>
              </Link>
            </div>

            {onActionClick && !readOnly ? (
              <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onActionClick('REVISE')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ขอแก้ไข</span>
                </button>

                <button
                  onClick={() => onActionClick('REJECT')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ไม่อนุมัติ</span>
                </button>

                <button
                  onClick={() => onActionClick('APPROVE')}
                  className="col-span-2 sm:col-auto px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>อนุมัติ / เห็นชอบโครงการ</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${project.id}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ไปที่หน้าโครงการ</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
