'use client';

import React from 'react';
import Link from 'next/link';
import { FolderKanban, ArrowUpRight, DollarSign, Calendar, Tag } from 'lucide-react';

interface ProjectCardData {
  project_id?: string;
  id?: string;
  project_code?: string;
  title: string;
  status?: string;
  total_budget?: number | string;
  fiscal_year?: number;
  department_name?: string;
}

export default function ProjectCardPreview({ data }: { data: ProjectCardData }) {
  const projectId = data.project_id || data.id;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return { text: 'อนุมัติแล้ว', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'in_progress':
        return { text: 'กำลังดำเนินการ', bg: 'bg-sky-100 text-sky-800 border-sky-300' };
      case 'completed':
        return { text: 'เสร็จสิ้นสมบูรณ์', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'submitted':
      case 'dept_approved':
      case 'deputy_approved':
      case 'planning_approved':
        return { text: 'อยู่ระหว่างการเสนออนุมัติ', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'rejected':
        return { text: 'ไม่อนุมัติ/ส่งกลับแก้ไข', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      default:
        return { text: 'แบบร่าง (Draft)', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  const statusBadge = getStatusBadge(data.status);
  const formattedBudget = data.total_budget
    ? Number(data.total_budget).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs max-w-md w-full transition hover:border-blue-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block truncate">
              {data.project_code || 'โครงการ'}
            </span>
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
              {statusBadge.text}
            </span>
          </div>
        </div>
        {projectId && (
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition shrink-0"
          >
            <span>เปิดดู</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <h4 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2 leading-snug">
        {data.title}
      </h4>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 truncate">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">งบ: <strong className="text-slate-900">{formattedBudget}</strong> บาท</span>
        </div>
        {data.fiscal_year && (
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">ปีงบฯ: <strong className="text-slate-900">{data.fiscal_year}</strong></span>
          </div>
        )}
      </div>

      {data.department_name && (
        <div className="text-[11px] text-slate-500 mt-1.5 truncate flex items-center gap-1">
          <Tag className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{data.department_name}</span>
        </div>
      )}
    </div>
  );
}
