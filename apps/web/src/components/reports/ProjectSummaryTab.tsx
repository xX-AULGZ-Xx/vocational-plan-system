'use client';

import React, { useState, useMemo } from 'react';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import OnePageSummaryReport from './OnePageSummaryReport';
import ModalPortal from '@/components/ui/ModalPortal';
import {
  FileText,
  Printer,
  Download,
  Save,
  Sparkles,
  Edit3,
  Paperclip,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';

interface ProjectSummaryTabProps {
  project: any;
  token?: string | null;
  onProjectUpdated?: () => void;
}

export default function ProjectSummaryTab({ project, token, onProjectUpdated }: ProjectSummaryTabProps) {
  const { collegeName, directorName, directorPosition } = useSettings();
  const [activeView, setActiveView] = useState<'preview' | 'edit'>('preview');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingFullDocx, setIsExportingFullDocx] = useState(false);
  const [isExportingFullPdf, setIsExportingFullPdf] = useState(false);
  const [selectingImageSlot, setSelectingImageSlot] = useState<number | null>(null);

  const imageDocuments = useMemo(() => {
    if (!Array.isArray(project?.documents)) return [];
    return project.documents.filter((doc: any) => {
      const ext = (doc.file_type || '').toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || (doc.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_name));
    });
  }, [project?.documents]);

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
    activities_summary: parsedDynamic.activities_summary || '',
    actual_results: parsedDynamic.actual_results || '',
    problems_obstacles: parsedDynamic.problems_obstacles_text || parsedDynamic.problems_obstacles || parsedDynamic.obstacles_and_solutions || '',
    project_suggestions: parsedDynamic.project_suggestions || parsedDynamic.summary_notes || '',
    summary_notes: parsedDynamic.summary_notes || '',
    key_achievements: parsedDynamic.key_achievements || '',
    obstacles_and_solutions: parsedDynamic.obstacles_and_solutions || '',
    activity_image_1: parsedDynamic.activity_image_1 || '',
    activity_image_2: parsedDynamic.activity_image_2 || '',
    activity_image_3: parsedDynamic.activity_image_3 || '',
    activity_image_4: parsedDynamic.activity_image_4 || '',
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

      const data = await res.json().catch(() => ({ success: false, message: 'การตอบสนองจากเซิร์ฟเวอร์ไม่ถูกต้อง' }));
      if (res.ok && data.success) {
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

  // Export Short Summary DOCX (One-page summary)
  const handleExportShortDocx = async () => {
    try {
      setIsExportingDocx(true);
      const authToken = token || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/v1/projects/${project.id}/export-summary-docx`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'SHORT_SUMMARY',
          dynamicData: summaryData,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'ดาวน์โหลดเอกสารไม่สำเร็จ');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (project.title || 'project_summary').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
      a.download = `สรุปโครงการ_แผ่นเดียว_${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export short summary docx error:', error);
      showAlert.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างไฟล์ Word สรุปโครงการได้');
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Export Short Summary PDF (One-page summary)
  const handleExportShortPdf = async () => {
    try {
      setIsExportingPdf(true);
      const authToken = token || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/v1/projects/${project.id}/export-summary-pdf`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'SHORT_SUMMARY',
          dynamicData: summaryData,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'ดาวน์โหลดเอกสาร PDF ไม่สำเร็จ');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (project.title || 'project_summary').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
      a.download = `สรุปโครงการ_แผ่นเดียว_${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export short summary pdf error:', error);
      showAlert.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างไฟล์ PDF สรุปโครงการได้');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Full Summary Booklet DOCX (เล่มสรุปผล)
  const handleExportFullDocx = async () => {
    try {
      setIsExportingFullDocx(true);
      const authToken = token || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/v1/projects/${project.id}/export-summary-docx`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'FULL_SUMMARY',
          dynamicData: summaryData,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'ดาวน์โหลดเล่มสรุปโครงการไม่สำเร็จ');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (project.title || 'project_summary').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
      a.download = `เล่มสรุปผลโครงการ_${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export full summary docx error:', error);
      showAlert.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างเล่มสรุปโครงการ Word ได้');
    } finally {
      setIsExportingFullDocx(false);
    }
  };

  // Export Full Summary Booklet PDF (เล่มสรุปผล)
  const handleExportFullPdf = async () => {
    try {
      setIsExportingFullPdf(true);
      const authToken = token || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/v1/projects/${project.id}/export-summary-pdf`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'FULL_SUMMARY',
          dynamicData: summaryData,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'ดาวน์โหลดเล่มสรุปโครงการ PDF ไม่สำเร็จ');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (project.title || 'project_summary').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
      a.download = `เล่มสรุปผลโครงการ_${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export full summary pdf error:', error);
      showAlert.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างเล่มสรุปโครงการ PDF ได้');
    } finally {
      setIsExportingFullPdf(false);
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
          {activeView === 'preview' && (
            <>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-theme border border-slate-200 mr-1">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2.5 py-1.5 rounded-theme text-xs font-bold transition flex items-center gap-1 ${
                    orientation === 'portrait'
                      ? 'bg-white text-indigo-950 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="สลับเป็นแนวตั้ง (A4 Portrait)"
                >
                  <span>แนวตั้ง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2.5 py-1.5 rounded-theme text-xs font-bold transition flex items-center gap-1 ${
                    orientation === 'landscape'
                      ? 'bg-white text-indigo-950 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="สลับเป็นแนวนอน (A4 Landscape)"
                >
                  <span>แนวนอน</span>
                </button>
              </div>

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
                onClick={handleExportShortDocx}
                disabled={isExportingDocx}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                title="ดาวน์โหลดสรุปโครงการแผ่นเดียวเป็นไฟล์ Word (.docx)"
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

              <button
                type="button"
                onClick={handleExportShortPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-theme bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                title="ดาวน์โหลดสรุปโครงการแผ่นเดียวเป็นไฟล์ PDF"
              >
                {isExportingPdf ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังสร้าง PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>ดาวน์โหลด PDF (.pdf)</span>
                  </>
                )}
              </button>
            </>
          )}

          {activeView === 'edit' && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
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

              <button
                type="button"
                onClick={handleExportFullDocx}
                disabled={isExportingFullDocx}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-theme bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                title="ดาวน์โหลดเล่มสรุปผลโครงการเป็นไฟล์ Word (.docx)"
              >
                {isExportingFullDocx ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังส่งออก...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดเล่มสรุป Word (.docx)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportFullPdf}
                disabled={isExportingFullPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-theme bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                title="ดาวน์โหลดเล่มสรุปผลโครงการเป็นไฟล์ PDF"
              >
                {isExportingFullPdf ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังสร้าง PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>ดาวน์โหลดเล่มสรุป PDF (.pdf)</span>
                  </>
                )}
              </button>
            </>
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

            {/* 4 Activity Images Upload / Preview Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 text-xs">
                  ภาพกิจกรรมโครงการ (๔ รูปภาพสำหรับแม่แบบสรุปโครงการ)
                </label>
                {imageDocuments.length > 0 && (
                  <span className="text-[11px] text-theme-primary font-medium">
                    (พบรูปภาพในแท็บไฟล์แนบ {imageDocuments.length} ภาพ)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((num) => {
                  const fieldKey = `activity_image_${num}` as keyof typeof summaryData;
                  const imgVal = summaryData[fieldKey];
                  return (
                    <div key={num} className="border-2 border-dashed border-slate-200 rounded-xl p-2.5 text-center bg-slate-50/50 hover:bg-slate-50 transition relative group flex flex-col justify-between">
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5">ภาพกิจกรรมที่ {num}</div>
                      {imgVal ? (
                        <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-900/5 mb-2 shadow-2xs flex items-center justify-center">
                          <img src={imgVal} alt={`Activity ${num}`} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => handleChange(fieldKey, '')}
                            className="absolute top-1 right-1 p-1 bg-rose-600/80 hover:bg-rose-700 text-white rounded-full text-[10px] transition shadow-xs"
                            title="ลบรูปภาพ"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 mb-1">
                          <label className="aspect-4/3 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-theme-primary hover:bg-white transition">
                            <span className="text-xl text-slate-400 mb-0.5">+</span>
                            <span className="text-[10px] text-slate-600 font-bold">อัปโหลดรูปใหม่</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    handleChange(fieldKey, ev.target?.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>

                          {imageDocuments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectingImageSlot(num)}
                              className="w-full py-1 px-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold border border-blue-200 flex items-center justify-center gap-1 transition"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>เลือกจากไฟล์แนบ</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Summary Columns (Matching DOCX Table) */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs">ตารางสรุปผลการดำเนินงาน ๔ ช่อง (ตามแบบฟอร์ม Word)</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">๑. กิจกรรมดำเนินการ (activities_summary)</label>
                  <textarea
                    rows={3}
                    value={summaryData.activities_summary}
                    onChange={(e) => handleChange('activities_summary', e.target.value)}
                    placeholder="เช่น ๑. ประชุมวางแผน ๒. ดำเนินการจัดอบรมเชิงปฏิบัติการ ๓. สรุปและประเมินผล"
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">๒. ผลที่ได้รับ (actual_results)</label>
                  <textarea
                    rows={3}
                    value={summaryData.actual_results}
                    onChange={(e) => handleChange('actual_results', e.target.value)}
                    placeholder="เช่น นักเรียนนักศึกษาเข้าร่วมครบตามเป้าหมาย มีความรู้และทักษะตามมาตรฐาน"
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">๓. ปัญหา-อุปสรรค (problems_obstacles)</label>
                  <textarea
                    rows={3}
                    value={summaryData.problems_obstacles}
                    onChange={(e) => handleChange('problems_obstacles', e.target.value)}
                    placeholder="ระบุปัญหา อุปสรรค หรือข้อติดขัดในการดำเนินงาน (ถ้ามี)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">๔. ข้อเสนอแนะ (project_suggestions)</label>
                  <textarea
                    rows={3}
                    value={summaryData.project_suggestions}
                    onChange={(e) => handleChange('project_suggestions', e.target.value)}
                    placeholder="ระบุข้อเสนอแนะสำหรับการจัดกิจกรรมหรือโครงการในครั้งต่อไป"
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>
              </div>
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
            orientation={orientation}
          />
        </div>
      )}

      {/* Modal for selecting image from attachments */}
      {selectingImageSlot !== null && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-theme-primary" />
                  <h3 className="font-bold text-sm text-slate-800">
                    เลือกรูปภาพจากแท็บไฟล์แนบ (สำหรับภาพกิจกรรมที่ {selectingImageSlot})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectingImageSlot(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {imageDocuments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">ยังไม่มีไฟล์รูปภาพในแท็บไฟล์แนบ</p>
                  <p className="text-[11px] text-slate-400 mt-1">ท่านสามารถอัปโหลดรูปภาพใหม่ลงในช่องได้โดยตรง</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
                  {imageDocuments.map((doc: any) => {
                    const docUrl = `/api/v1/projects/documents/${doc.id}/download`;
                    return (
                      <div
                        key={doc.id}
                        onClick={async () => {
                          try {
                            // Fetch and convert to base64 data URL so Word template can render it seamlessly
                            const res = await fetch(docUrl);
                            const blob = await res.blob();
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              handleChange(`activity_image_${selectingImageSlot}`, e.target?.result as string);
                              setSelectingImageSlot(null);
                            };
                            reader.readAsDataURL(blob);
                          } catch (err) {
                            console.error('Error loading attachment image:', err);
                            handleChange(`activity_image_${selectingImageSlot}`, docUrl);
                            setSelectingImageSlot(null);
                          }
                        }}
                        className="group cursor-pointer border border-slate-200 hover:border-theme-primary rounded-xl overflow-hidden bg-slate-50 hover:bg-white transition flex flex-col p-2 text-left shadow-2xs hover:shadow-md"
                      >
                        <div className="aspect-4/3 rounded-lg overflow-hidden bg-slate-200 mb-2 relative">
                          <img
                            src={docUrl}
                            alt={doc.file_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 line-clamp-1 group-hover:text-theme-primary" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase mt-0.5">
                          {doc.file_type || 'IMAGE'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectingImageSlot(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
