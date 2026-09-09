'use client';

import React, { useState, useMemo } from 'react';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import OnePageSummaryReport from './OnePageSummaryReport';
import {
  FileText,
  Printer,
  Download,
  Save,
  Sparkles,
  Edit3
} from 'lucide-react';

interface ProjectSummaryTabProps {
  project: any;
  token?: string | null;
  onProjectUpdated?: () => void;
}

export default function ProjectSummaryTab({ project, token, onProjectUpdated }: ProjectSummaryTabProps) {
  const { collegeName, directorName, directorPosition } = useSettings();
  const [activeView, setActiveView] = useState<'preview' | 'edit'>('preview');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const parsedDynamic = useMemo(() => {
    if (!project?.dynamic_data) return {};
    let temp = project.dynamic_data;
    while (typeof temp === 'string') {
      try { temp = JSON.parse(temp); } catch { break; }
    }
    return temp || {};
  }, [project?.dynamic_data]);

  const [summaryData, setSummaryData] = useState({
    actual_spent: project?.actual_spent || parsedDynamic.actual_spent || project?.total_budget || 0,
    operation_status: parsedDynamic.operation_status || 'ดำเนินงานแล้วเสร็จ 100%',
    summary_notes: parsedDynamic.summary_notes || '',
    key_achievements: parsedDynamic.key_achievements || '',
    obstacles_and_solutions: parsedDynamic.obstacles_and_solutions || '',
  });

  const handleChange = (field: string, value: any) => {
    setSummaryData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!project?.id) return;
    setIsSaving(true);
    try {
      const mergedDynamic = {
        ...parsedDynamic,
        ...summaryData,
      };

      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : '');

      let res = await fetch(`/api/v1/projects/${project.id}/summary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          dynamic_data: JSON.stringify(mergedDynamic),
          actual_spent: Number(summaryData.actual_spent) || 0,
        }),
      });

      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/v1/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            dynamic_data: JSON.stringify(mergedDynamic),
            actual_spent: Number(summaryData.actual_spent) || 0,
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        showAlert.success('บันทึกข้อมูลสำเร็จ', 'บันทึกข้อมูลสรุปผลการดำเนินงานโครงการเรียบร้อยแล้ว');
        if (onProjectUpdated) onProjectUpdated();
      } else {
        showAlert.error('บันทึกไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (e: any) {
      showAlert.error('เกิดข้อผิดพลาด', e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);
      const authToken = token || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/v1/projects/${project.id}/export-summary-docx`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'ดาวน์โหลดเอกสารไม่สำเร็จ');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (project.title || 'project_summary').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
      a.download = `สรุปผลโครงการ_${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export docx error:', error);
      showAlert.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างไฟล์ Word ได้');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const mergedProjectForPreview = {
    ...project,
    actual_spent: summaryData.actual_spent,
    dynamic_data: {
      ...parsedDynamic,
      ...summaryData,
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-theme border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-theme border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveView('preview')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme text-xs font-bold transition ${
              activeView === 'preview'
                ? 'bg-theme-primary text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>เอกสารสรุปโครงการ (One-Page Summary)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('edit')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme text-xs font-bold transition ${
              activeView === 'edit'
                ? 'bg-theme-primary text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>บันทึกผลการเบิกจ่าย / สรุปผล</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-theme bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน A4</span>
          </button>

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            {isExportingDocx ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังส่งออก...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด Word (.docx)</span>
              </>
            )}
          </button>

          {activeView === 'edit' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-xs transition"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูล</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {activeView === 'edit' && (
        <div className="bg-white rounded-theme border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="bg-theme-gradient p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-theme bg-white/20 flex items-center justify-center font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold">บันทึกผลการดำเนินงานและงบประมาณจริง</h3>
                <p className="text-[11px] text-slate-200">ระบุยอดเงินที่ใช้จ่ายจริงและผลสัมฤทธิ์ของโครงการ</p>
              </div>
            </div>
            <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-white/90 font-medium">
              สรุปโครงการ
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">งบประมาณที่ได้รับอนุมัติ (บาท)</label>
                <input
                  type="text"
                  value={Number(project?.total_budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  disabled
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-theme text-slate-600 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ยอดใช้จ่ายจริง (บาท)</label>
                <input
                  type="number"
                  value={summaryData.actual_spent}
                  onChange={(e) => handleChange('actual_spent', e.target.value)}
                  placeholder="ระบุจำนวนเงินที่ใช้จ่ายจริง"
                  className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">สถานะการดำเนินงาน</label>
                <select
                  value={summaryData.operation_status}
                  onChange={(e) => handleChange('operation_status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition bg-white"
                >
                  <option value="ดำเนินงานแล้วเสร็จ 100%">ดำเนินงานแล้วเสร็จ 100%</option>
                  <option value="อยู่ระหว่างดำเนินการ">อยู่ระหว่างดำเนินการ</option>
                  <option value="ยกเลิก / ปรับเปลี่ยนโครงการ">ยกเลิก / ปรับเปลี่ยนโครงการ</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ผลสัมฤทธิ์หลักของโครงการ</label>
                <input
                  type="text"
                  value={summaryData.key_achievements}
                  onChange={(e) => handleChange('key_achievements', e.target.value)}
                  placeholder="เช่น บรรลุวัตถุประสงค์ 100% ผู้เข้าร่วมพึงพอใจระดับดีเด่น"
                  className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ปัญหา อุปสรรค และแนวทางแก้ไข</label>
              <textarea
                rows={3}
                value={summaryData.obstacles_and_solutions}
                onChange={(e) => handleChange('obstacles_and_solutions', e.target.value)}
                placeholder="ระบุปัญหา อุปสรรค หรือข้อเสนอแนะในการดำเนินงาน (ถ้ามี)"
                className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">หมายเหตุ / สรุปผลเพิ่มเติม</label>
              <textarea
                rows={2}
                value={summaryData.summary_notes}
                onChange={(e) => handleChange('summary_notes', e.target.value)}
                placeholder="ระบุหมายเหตุหรือข้อความสรุปเพิ่มเติม"
                className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>บันทึกผลการดำเนินงาน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="bg-slate-200/60 p-4 sm:p-8 rounded-2xl border border-slate-200 flex justify-center overflow-x-auto print:bg-white print:p-0 print:border-none animate-in fade-in duration-150">
          <OnePageSummaryReport
            project={mergedProjectForPreview}
            collegeName={collegeName}
            directorName={directorName}
            directorPosition={directorPosition}
          />
        </div>
      )}
    </div>
  );
}
