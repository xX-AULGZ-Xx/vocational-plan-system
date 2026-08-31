'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  ChevronRight
} from 'lucide-react';

interface ProjectQuickPreviewModalProps {
  project: any;
  approvalStep: number;
  onClose: () => void;
  onActionClick: (action: 'APPROVE' | 'REVISE' | 'REJECT') => void;
}

export default function ProjectQuickPreviewModal({
  project,
  approvalStep,
  onClose,
  onActionClick,
}: ProjectQuickPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'timeline' | 'docs'>('overview');

  if (!project) return null;

  // Format objectives
  let objectivesList: string[] = [];
  if (Array.isArray(project.objectives)) {
    objectivesList = project.objectives.map((o: any) => typeof o === 'object' && o !== null ? (o.title || o.name || o.item || JSON.stringify(o)) : String(o));
  } else if (typeof project.objectives === 'string') {
    try {
      const parsed = JSON.parse(project.objectives);
      if (Array.isArray(parsed)) {
        objectivesList = parsed.map((o: any) => typeof o === 'object' && o !== null ? (o.title || o.name || o.item || JSON.stringify(o)) : String(o));
      }
    } catch {
      objectivesList = [project.objectives];
    }
  }

  const formatThaiDate = (dateStr: string | Date | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const totalBudget = Number(project.total_budget || 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[11px] font-bold">
                ขั้นที่ {approvalStep}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold">
                ปีงบประมาณ {project.fiscal_year}
              </span>
              {project.project_code && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-mono font-bold">
                  {project.project_code}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold leading-snug truncate">
              {project.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-blue-400" />
                {project.department?.name} ({project.department?.division?.name || 'ฝ่ายวิชาการ'})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                ผู้เสนอ: {project.leader?.full_name} ({project.leader?.position || 'ครู'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/projects/${project.id}`}
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1"
            >
              <span>เปิดหน้าเต็ม</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {[
            { id: 'overview', label: 'ภาพรวมโครงการ', icon: FileText },
            { id: 'budget', label: `งบประมาณ (${totalBudget.toLocaleString('th-TH')} บ.)`, icon: DollarSign },
            { id: 'timeline', label: `กำหนดการ (${project.timelines?.length || 0} กิจกรรม)`, icon: Calendar },
            { id: 'docs', label: `เอกสารแนบ (${project.documents?.length || 0})`, icon: Paperclip },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-800 text-xs sm:text-sm">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Background / Rationale */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-900">
                  <FileText className="w-4 h-4" /> หลักการและเหตุผล
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs">
                  {project.background || 'ไม่มีการระบุหลักการและเหตุผล'}
                </p>
              </div>

              {/* Objectives */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <h4 className="font-bold text-blue-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Target className="w-4 h-4 text-blue-900" /> วัตถุประสงค์ของโครงการ
                </h4>
                {objectivesList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">ไม่ระบุวัตถุประสงค์</p>
                ) : (
                  <ul className="space-y-1.5">
                    {objectivesList.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-800">
                        <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{obj}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Targets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">เป้าหมายเชิงปริมาณ</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {project.target_groups?.quantitative || 'ไม่ระบุ'}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">เป้าหมายเชิงคุณภาพ</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {project.target_groups?.qualitative || 'ไม่ระบุ'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-200 font-medium">งบประมาณรวมทั้งสิ้น</p>
                  <p className="text-2xl font-black">{totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold">
                  {project.budget_items?.length || 0} รายการค่าใช้จ่าย
                </div>
              </div>

              {/* Budget Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-3">รายการค่าใช้จ่าย</th>
                      <th className="py-2.5 px-3">หมวดงบ</th>
                      <th className="py-2.5 px-3 text-right">จำนวน</th>
                      <th className="py-2.5 px-3">หน่วย</th>
                      <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                      <th className="py-2.5 px-3 text-right">รวมเป็นเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(project.budget_items || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">
                          ไม่มีรายการค่าใช้จ่าย
                        </td>
                      </tr>
                    ) : (
                      project.budget_items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{item.description}</td>
                          <td className="py-2 px-3 text-slate-600">{item.category?.name || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono">{Number(item.quantity).toLocaleString()}</td>
                          <td className="py-2 px-3 text-slate-500">{item.unit}</td>
                          <td className="py-2 px-3 text-right font-mono">{Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                            {Number(item.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                กำหนดการและกิจกรรมตามกระบวนการ PDCA
              </h4>
              <div className="space-y-2">
                {(project.timelines || []).length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">ไม่มีกำหนดการกิจกรรม</p>
                ) : (
                  project.timelines.map((t: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{t.activity_name}</p>
                          {t.location && <p className="text-[11px] text-slate-500">สถานที่: {t.location}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                          {formatThaiDate(t.start_date)} - {formatThaiDate(t.end_date)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                ไฟล์เอกสารประกอบโครงการ
              </h4>
              <div className="space-y-2">
                {(project.documents || []).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                    ไม่มีไฟล์เอกสารแนบ
                  </div>
                ) : (
                  project.documents.map((doc: any) => (
                    <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-5 h-5 text-blue-900 shrink-0" />
                        <div className="truncate">
                          <p className="font-bold text-slate-900 text-xs truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-400">อัปโหลดเมื่อ {formatThaiDate(doc.created_at)}</p>
                        </div>
                      </div>
                      <a
                        href={`/api/v1/projects/documents/${doc.id}/download`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shrink-0"
                      >
                        ดาวน์โหลด
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            ปิดหน้าต่าง
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onActionClick('REVISE')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ขอแก้ไข</span>
            </button>

            <button
              onClick={() => onActionClick('REJECT')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>ไม่อนุมัติ</span>
            </button>

            <button
              onClick={() => onActionClick('APPROVE')}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>อนุมัติ / เห็นชอบโครงการ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
