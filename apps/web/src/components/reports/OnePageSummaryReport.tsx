'use client';

import React from 'react';
import {
  Award,
  CheckCircle2,
  DollarSign,
  Building,
  Target,
  FileSpreadsheet,
  AlertTriangle,
  Lightbulb,
  Image as ImageIcon,
  Sparkles,
  PieChart,
  UserCheck
} from 'lucide-react';

interface OnePageSummaryProps {
  project: any;
  collegeName?: string;
  directorName?: string;
  directorPosition?: string;
}

export default function OnePageSummaryReport({
  project,
  collegeName = 'วิทยาลัยการอาชีพเชียงราย',
  directorName = 'นางปิยะพร พูลเพิ่ม',
  directorPosition = 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย',
}: OnePageSummaryProps) {
  if (!project) return null;

  // Extract dynamic data
  let dyn: any = project.dynamic_data || {};
  while (typeof dyn === 'string') {
    try {
      dyn = JSON.parse(dyn);
    } catch {
      break;
    }
  }

  const totalBudget = Number(project.total_budget || 0);
  const actualSpent = Number(project.actual_spent ?? dyn.actual_spent ?? totalBudget);
  const balance = totalBudget - actualSpent;
  const spendingPercentage = totalBudget > 0 ? ((actualSpent / totalBudget) * 100).toFixed(1) : '100.0';

  const operationStatus = dyn.operation_status || 'ดำเนินงานแล้วเสร็จ 100%';
  const activitiesSummary = dyn.activities_summary || project.background || '-';
  const actualResults = dyn.actual_results || dyn.key_achievements || project.expected_results || '-';
  const problemsObstacles = dyn.problems_obstacles || dyn.problems_obstacles_text || dyn.obstacles_and_solutions || '-';
  const projectSuggestions = dyn.project_suggestions || dyn.summary_notes || '-';

  const activityImages = [
    dyn.activity_image_1,
    dyn.activity_image_2,
    dyn.activity_image_3,
    dyn.activity_image_4,
  ].filter(Boolean);

  const deputyDirectorName = dyn.deputy_director_name || project.deputy_director_name || 'นายประเสริฐ กาสมุทร';
  const deputyDirectorPosition = dyn.deputy_director_position || project.deputy_director_position || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ';

  return (
    <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-6 sm:p-8 text-slate-800 shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-4 print:m-0 font-sans flex flex-col justify-between box-border">
      {/* 1. Header Banner */}
      <div className="border-b-2 border-indigo-900 pb-3 mb-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-900 text-white text-[11px] font-bold shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>สรุปผลการดำเนินงานโครงการ (Executive Summary Dashboard)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight pt-0.5">
              {project.title}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {collegeName} • ประจำปีงบประมาณ พ.ศ. {project.fiscal_year}
            </p>
          </div>
          {project.project_code && (
            <div className="text-right bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl shrink-0">
              <span className="text-[10px] text-indigo-700 block uppercase font-bold">รหัสโครงการ</span>
              <span className="text-xs font-mono font-black text-indigo-950">{project.project_code}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Approved Budget */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-indigo-700">
            <DollarSign className="w-4 h-4" />
            <span className="text-[11px] font-bold">งบประมาณอนุมัติ</span>
          </div>
          <p className="text-sm font-black text-slate-900">
            {totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-500">บาท</span>
          </p>
        </div>

        {/* Actual Spent */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-0.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-blue-800">
              <PieChart className="w-4 h-4" />
              <span className="text-[11px] font-bold">เบิกจ่ายจริง ({spendingPercentage}%)</span>
            </div>
          </div>
          <p className="text-sm font-black text-blue-950">
            {actualSpent.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-blue-700">บาท</span>
          </p>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Number(spendingPercentage))}%` }}
            ></div>
          </div>
        </div>

        {/* Operation Status */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-0.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[11px] font-bold">สถานะโครงการ</span>
          </div>
          <p className="text-xs font-black text-emerald-900 truncate" title={operationStatus}>
            {operationStatus}
          </p>
          <p className="text-[10px] text-emerald-700 font-medium">
            {balance >= 0 ? `คงเหลือ ${balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : `เกินงบ ${Math.abs(balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`}
          </p>
        </div>

        {/* Department / Responsible Unit */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Building className="w-4 h-4" />
            <span className="text-[11px] font-bold">หน่วยงานรับผิดชอบ</span>
          </div>
          <p className="text-xs font-bold text-slate-900 truncate" title={project.department?.name}>
            {project.department?.name || '-'}
          </p>
          <p className="text-[10px] text-slate-500 truncate">{project.department?.division?.name || collegeName}</p>
        </div>
      </div>

      {/* 3. Four Core Analysis Cards (2x2 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* 1. กิจกรรมดำเนินการ */}
        <div className="p-3.5 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-xl shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">๑</div>
              <span>กิจกรรมดำเนินการ (Activities Summary)</span>
            </h3>
            <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
              {activitiesSummary}
            </p>
          </div>
        </div>

        {/* 2. ผลที่ได้รับ */}
        <div className="p-3.5 bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100 rounded-xl shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 border-b border-emerald-100 pb-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">๒</div>
              <span>ผลที่ได้รับ (Actual Results & Key Achievements)</span>
            </h3>
            <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
              {actualResults}
            </p>
          </div>
        </div>

        {/* 3. ปัญหา-อุปสรรค */}
        <div className="p-3.5 bg-gradient-to-br from-amber-50/40 to-white border border-amber-100 rounded-xl shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 border-b border-amber-100 pb-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">๓</div>
              <span>ปัญหาและอุปสรรค (Problems & Obstacles)</span>
            </h3>
            <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
              {problemsObstacles}
            </p>
          </div>
        </div>

        {/* 4. ข้อเสนอแนะ */}
        <div className="p-3.5 bg-gradient-to-br from-blue-50/40 to-white border border-blue-100 rounded-xl shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 border-b border-blue-100 pb-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">๔</div>
              <span>ข้อเสนอแนะเพื่อการพัฒนา (Suggestions)</span>
            </h3>
            <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
              {projectSuggestions}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Four Activity Images Section */}
      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">
          <ImageIcon className="w-4 h-4 text-indigo-700" />
          <span>ภาพถ่ายการดำเนินกิจกรรมโครงการ (๔ รูปภาพ)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((num) => {
            const imgUrl = dyn[`activity_image_${num}`];
            return (
              <div
                key={num}
                className="aspect-4/3 rounded-lg overflow-hidden border border-slate-300 bg-white relative shadow-2xs flex flex-col items-center justify-center group"
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={`ภาพกิจกรรมที่ ${num}`}
                    className="w-full h-full object-contain bg-slate-900/5 group-hover:scale-105 transition duration-200"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <ImageIcon className="w-6 h-6 mx-auto opacity-40 mb-1" />
                    <span className="text-[10px] font-semibold block text-slate-400">ภาพกิจกรรมที่ {num}</span>
                    <span className="text-[9px] text-slate-400">(ยังไม่มีรูปภาพ)</span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-slate-900/70 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-xs font-medium">
                  ภาพที่ {num}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Executive Signatures Bar (Leader, Deputy, Director) */}
      <div className="pt-2 border-t-2 border-slate-200 grid grid-cols-3 gap-2 text-center text-xs text-slate-800">
        <div className="space-y-0.5">
          <p className="text-[10px] text-slate-500 font-semibold">ผู้รายงาน / ผู้รับผิดชอบโครงการ</p>
          <div className="h-7 flex items-center justify-center font-bold text-slate-900 text-xs">
            ({project.leader?.full_name || '...................................................'})
          </div>
          <p className="text-[9px] text-slate-600">{project.leader?.position || 'ตำแหน่ง ครู'}</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] text-slate-500 font-semibold">ผู้ตรวจรายงาน</p>
          <div className="h-7 flex items-center justify-center font-bold text-slate-900 text-xs">
            ({deputyDirectorName})
          </div>
          <p className="text-[9px] text-slate-600">{deputyDirectorPosition}</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] text-slate-500 font-semibold">ผู้อนุมัติรายงาน</p>
          <div className="h-7 flex items-center justify-center font-bold text-slate-900 text-xs">
            ({directorName})
          </div>
          <p className="text-[9px] text-slate-600">{directorPosition}</p>
        </div>
      </div>
    </div>
  );
}

