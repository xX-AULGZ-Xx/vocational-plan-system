'use client';

import React from 'react';
import { Award, CheckCircle2, TrendingUp, Users, DollarSign, Calendar, MapPin, Building, ShieldCheck } from 'lucide-react';

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

  const totalBudget = Number(project.total_budget || 0);
  const objectives = Array.isArray(project.objectives) ? project.objectives : [];
  const timelines = Array.isArray(project.timelines) ? project.timelines : [];
  const budgetItems = Array.isArray(project.budget_items) ? project.budget_items : [];

  const startDate = timelines[0]?.start_date ? new Date(timelines[0].start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const endDate = timelines[timelines.length - 1]?.end_date ? new Date(timelines[timelines.length - 1].end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const location = timelines[0]?.location || collegeName;

  return (
    <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-8 sm:p-10 text-slate-800 shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-6 print:m-0 font-sans flex flex-col justify-between box-border">
      {/* Header Banner */}
      <div className="border-b-2 border-blue-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-900 text-white text-[11px] font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>เอกสารสรุปผลโครงการแผ่นเดียว (One-Page Executive Summary)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {project.title}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {collegeName} • ประจำปีงบประมาณ พ.ศ. {project.fiscal_year}
            </p>
          </div>
          {project.project_code && (
            <div className="text-right bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">รหัสโครงการ</span>
              <span className="text-xs font-mono font-black text-blue-950">{project.project_code}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
          <div className="flex items-center gap-1.5 text-blue-900">
            <DollarSign className="w-4 h-4" />
            <span className="text-[11px] font-bold">งบประมาณอนุมัติ</span>
          </div>
          <p className="text-base font-black text-slate-900">
            {totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-500">บาท</span>
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[11px] font-bold">สถานะโครงการ</span>
          </div>
          <p className="text-sm font-black text-emerald-800">
            อนุมัติสมบูรณ์ (100%)
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
          <div className="flex items-center gap-1.5 text-indigo-700">
            <Building className="w-4 h-4" />
            <span className="text-[11px] font-bold">หน่วยงานรับผิดชอบ</span>
          </div>
          <p className="text-xs font-bold text-slate-900 truncate" title={project.department?.name}>
            {project.department?.name || '-'}
          </p>
          <p className="text-[10px] text-slate-500 truncate">{project.department?.division?.name}</p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
          <div className="flex items-center gap-1.5 text-amber-700">
            <Calendar className="w-4 h-4" />
            <span className="text-[11px] font-bold">ระยะเวลาดำเนินงาน</span>
          </div>
          <p className="text-[11px] font-bold text-slate-900">
            {startDate} - {endDate}
          </p>
        </div>
      </div>

      {/* 2-Column Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 flex-1">
        {/* Left Column: Background, Objectives & Target Groups */}
        <div className="space-y-3">
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <TrendingUp className="w-3.5 h-3.5" /> ๑. วัตถุประสงค์และผลสัมฤทธิ์
            </h3>
            {objectives.length > 0 ? (
              <ul className="text-[11px] space-y-1 text-slate-700 pl-4 list-disc">
                {objectives.map((obj: string, i: number) => (
                  <li key={i} className="leading-snug">{obj}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-600 leading-snug">{project.background || 'เพื่อพัฒนาคุณภาพผู้เรียนและส่งเสริมทักษะวิชาชีพตามมาตรฐาน'}</p>
            )}
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <Users className="w-3.5 h-3.5" /> ๒. กลุ่มเป้าหมายและผู้เข้าร่วม
            </h3>
            <div className="space-y-1 text-[11px] text-slate-700">
              <p>
                <strong className="text-slate-900">เชิงปริมาณ:</strong> {project.target_groups?.quantitative || 'นักเรียน นักศึกษา และบุคลากรที่เกี่ยวข้อง'}
              </p>
              <p>
                <strong className="text-slate-900">เชิงคุณภาพ:</strong> {project.target_groups?.qualitative || 'ผู้เข้าร่วมมีความรู้และทักษะเพิ่มขึ้นไม่น้อยกว่าร้อยละ ๘๐'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <MapPin className="w-3.5 h-3.5" /> ๓. สถานที่และผลที่คาดว่าจะได้รับ
            </h3>
            <p className="text-[11px] text-slate-700 leading-snug">
              <strong className="text-slate-900">สถานที่:</strong> {location}
            </p>
            <p className="text-[11px] text-slate-700 leading-snug">
              <strong className="text-slate-900">ประโยชน์:</strong> {project.expected_results || 'ยกระดับมาตรฐานการศึกษาและเพิ่มสมรรถนะวิชาชีพของผู้เรียน'}
            </p>
          </div>
        </div>

        {/* Right Column: Budget Breakdown & Key Activities */}
        <div className="space-y-3">
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <DollarSign className="w-3.5 h-3.5" /> ๔. สรุปรายการงบประมาณ
            </h3>
            {budgetItems.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-1.5">รายการ</th>
                      <th className="p-1.5 text-center">จำนวน</th>
                      <th className="p-1.5 text-right">รวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {budgetItems.slice(0, 5).map((b: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 truncate max-w-[120px]">{b.description}</td>
                        <td className="p-1.5 text-center">{b.quantity} {b.unit}</td>
                        <td className="p-1.5 text-right font-medium">{Number(b.total_amount || 0).toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50/50 font-bold text-blue-950 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="p-1.5">รวมงบประมาณทั้งสิ้น</td>
                      <td className="p-1.5 text-right font-black">{totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">ไม่ใช้งบประมาณ สอศ.</p>
            )}
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <Calendar className="w-3.5 h-3.5" /> ๕. แผนการดำเนินงาน (PDCA)
            </h3>
            {timelines.length > 0 ? (
              <div className="space-y-1 text-[10px]">
                {timelines.slice(0, 4).map((t: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">{t.activity_name}</span>
                    <span className="text-slate-500 font-mono text-[9px]">
                      {new Date(t.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">ดำเนินการตามปฏิทินปฏิบัติงานประจำภาคเรียน</p>
            )}
          </div>
        </div>
      </div>

      {/* Signature & Endorsement Bottom Bar */}
      <div className="pt-3 border-t-2 border-slate-200 grid grid-cols-2 gap-6 text-center text-xs text-slate-800">
        <div className="space-y-1">
          <p className="text-[11px] text-slate-500">ผู้รับผิดชอบโครงการ</p>
          <div className="h-9 flex items-center justify-center font-bold text-slate-900">
            ({project.leader?.full_name || '...................................................'})
          </div>
          <p className="text-[10px] text-slate-600">{project.leader?.position || 'ตำแหน่ง ครู'}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] text-slate-500">ผู้อนุมัติโครงการ</p>
          <div className="h-9 flex items-center justify-center font-bold text-slate-900">
            ({directorName})
          </div>
          <p className="text-[10px] text-slate-600">{directorPosition}</p>
        </div>
      </div>
    </div>
  );
}
