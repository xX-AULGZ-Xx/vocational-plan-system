'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import OnePageSummaryReport from './OnePageSummaryReport';
import FullBookletReport from './FullBookletReport';
import {
  FileText,
  BookOpen,
  Printer,
  Download,
  Save,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';

interface ProjectSummaryTabProps {
  project: any;
  token?: string | null;
  onProjectUpdated?: () => void;
}

export default function ProjectSummaryTab({ project, token, onProjectUpdated }: ProjectSummaryTabProps) {
  const { collegeName, directorName, directorPosition } = useSettings();
  const [activeView, setActiveView] = useState<'form' | 'one_page' | 'full_booklet'>('form');
  const [isSaving, setIsSaving] = useState(false);

  const parsedDynamic = useMemo(() => {
    if (!project?.dynamic_data) return {};
    let temp = project.dynamic_data;
    while (typeof temp === 'string') {
      try { temp = JSON.parse(temp); } catch { break; }
    }
    return temp || {};
  }, [project?.dynamic_data]);

  // Extract proposal objectives cleanly from project.objectives or dynamic_data
  const proposalObjectives = useMemo(() => {
    let raw = project?.objectives;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = [raw]; }
    }
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((item: any) => typeof item === 'object' && item !== null ? (item.title || item.name || item.description || JSON.stringify(item)) : String(item)).filter(Boolean);
    }
    if (parsedDynamic.objectives_raw) {
      return Array.isArray(parsedDynamic.objectives_raw) ? parsedDynamic.objectives_raw : [parsedDynamic.objectives_raw];
    }
    return [];
  }, [project?.objectives, parsedDynamic]);

  const [formData, setFormData] = useState({
    memo_dept: parsedDynamic.memo_dept || project?.department?.name || '',
    doc_date: parsedDynamic.doc_date || new Date().toISOString().split('T')[0],
    subject: parsedDynamic.subject || ('รายงานผลการดำเนินงานโครงการ ' + (project?.title || '')),
    memo_paragraph1: parsedDynamic.memo_paragraph1 || ('ตามที่ แผนก/งาน ได้รับอนุมัติให้ดำเนินโครงการ ' + (project?.title || '') + ' ประจำปีงบประมาณ พ.ศ. ' + (project?.fiscal_year || 2569) + ' นั้น'),
    memo_paragraph2: parsedDynamic.memo_paragraph2 || 'บัดนี้ การดำเนินงานตามโครงการดังกล่าวได้เสร็จสิ้นเป็นที่เรียบร้อยแล้ว จึงขอรายงานผลการดำเนินงานตามเอกสารที่แนบมาพร้อมนี้',
    reporter_name: parsedDynamic.reporter_name || project?.leader?.full_name || '',
    reporter_position: parsedDynamic.reporter_position || project?.leader?.position || '',
    cover_image: parsedDynamic.cover_image || '',
    report_subject: parsedDynamic.report_subject || ('รายงานผลการดำเนินงานการปฏิบัติการ/' + (project?.title || '')),
    intro_paragraph: parsedDynamic.intro_paragraph || project?.background || '',
    department_name: parsedDynamic.department_name || project?.department?.name || '',
    division_name: parsedDynamic.division_name || project?.department?.division?.name || 'ฝ่ายวิชาการ',
    qa_standard: parsedDynamic.qa_standard || 'มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์',
    qa_issue: parsedDynamic.qa_issue || '๑.๑ ด้านความรู้ ความสามารถ และทักษะการปฏิบัติงาน',
    qa_aspect: parsedDynamic.qa_aspect || 'ด้านสมรรถนะวิชาชีพและเทคโนโลยี',
    objectives: Array.isArray(parsedDynamic.objectives) && parsedDynamic.objectives.length > 0 
      ? parsedDynamic.objectives 
      : (proposalObjectives.length > 0 ? proposalObjectives : ['เพื่อพัฒนาทักษะวิชาชีพแก่นักศึกษา']),
    target_quantitative: parsedDynamic.target_quantitative || project?.target_groups?.quantitative || '',
    target_qualitative: parsedDynamic.target_qualitative || project?.target_groups?.qualitative || '',
    operation_status: parsedDynamic.operation_status || 'ดำเนินงานแล้ว',
    real_date_start: parsedDynamic.real_date_start || (project?.timelines?.[0]?.start_date ? new Date(project.timelines[0].start_date).toISOString().split('T')[0] : ''),
    real_date_end: parsedDynamic.real_date_end || (project?.timelines?.[project.timelines.length - 1]?.end_date ? new Date(project.timelines[project.timelines.length - 1].end_date).toISOString().split('T')[0] : ''),
    actual_result_quantitative: parsedDynamic.actual_result_quantitative || '',
    actual_result_qualitative: parsedDynamic.actual_result_qualitative || '',
    other_organization: parsedDynamic.other_organization || '',
    other_budget: parsedDynamic.other_budget || '',
    allocated_budget: parsedDynamic.allocated_budget || project?.total_budget || 0,
    expenditure_performance: parsedDynamic.expenditure_performance || project?.actual_spent || project?.total_budget || 0,
    budget_fund_type: parsedDynamic.budget_fund_type || 'เงินอุดหนุนโครงการสนับสนุนค่าใช้จ่ายในการจัดการศึกษาตั้งแต่ระดับอนุบาลจนจบการศึกษาขั้นพื้นฐาน',
    spending_status: parsedDynamic.spending_status || 'ใช้เงินตามแผน',
    spending_diff_amount: parsedDynamic.spending_diff_amount || '',
    evaluation_rating: parsedDynamic.evaluation_rating || 'ดีเลิศ',
    problems_obstacles: Array.isArray(parsedDynamic.problems_obstacles) && parsedDynamic.problems_obstacles.length > 0
      ? parsedDynamic.problems_obstacles
      : ['ระยะเวลาในการจัดกิจกรรมค่อนข้างจำกัด'],
    project_strengths: parsedDynamic.project_strengths || 'ผู้เข้าร่วมมีความสนใจและให้ความร่วมมือในการปฏิบัติงานเป็นอย่างดี',
    project_weaknesses: parsedDynamic.project_weaknesses || '',
    project_suggestions: parsedDynamic.project_suggestions || 'ควรจัดอบรมเพิ่มระยะเวลาหรือจัดหลักสูตรต่อเนื่อง',
    dissemination_channel: parsedDynamic.dissemination_channel || 'เว็บไซต์',
    dissemination_other: parsedDynamic.dissemination_other || '',
    head_dept_name: parsedDynamic.head_dept_name || '',
    deputy_name: parsedDynamic.deputy_name || '',
    director_name: parsedDynamic.director_name || directorName || 'นางปิยะพร พูลเพิ่ม',
  });

  useEffect(() => {
    if (project) {
      setFormData(prev => ({
        ...prev,
        ...parsedDynamic,
        objectives: Array.isArray(parsedDynamic.objectives) && parsedDynamic.objectives.length > 0
          ? parsedDynamic.objectives
          : (proposalObjectives.length > 0 ? proposalObjectives : prev.objectives),
      }));
    }
  }, [project, parsedDynamic, proposalObjectives]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddObjective = () => {
    setFormData(prev => ({ ...prev, objectives: [...prev.objectives, ''] }));
  };
  const handleObjectiveChange = (index: number, val: string) => {
    const updated = [...formData.objectives];
    updated[index] = val;
    setFormData(prev => ({ ...prev, objectives: updated }));
  };
  const handleRemoveObjective = (index: number) => {
    setFormData(prev => ({ ...prev, objectives: prev.objectives.filter((_: any, i: number) => i !== index) }));
  };

  const handleAddProblem = () => {
    setFormData(prev => ({ ...prev, problems_obstacles: [...prev.problems_obstacles, ''] }));
  };
  const handleProblemChange = (index: number, val: string) => {
    const updated = [...formData.problems_obstacles];
    updated[index] = val;
    setFormData(prev => ({ ...prev, problems_obstacles: updated }));
  };

  const handleRemoveProblem = (index: number) => {
    setFormData(prev => ({ ...prev, problems_obstacles: prev.problems_obstacles.filter((_: any, i: number) => i !== index) }));
  };

  const [uploadingCover, setUploadingCover] = useState(false);

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project?.id) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      showAlert.warning('รูปแบบไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, JPEG)');
      return;
    }

    setUploadingCover(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : '');

      const res = await fetch(`/api/v1/projects/${project.id}/cover-image`, {
        method: 'POST',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: uploadData,
      });

      const json = await res.json();
      if (json.success && json.data?.imageUrl) {
        setFormData(prev => ({ ...prev, cover_image: json.data.imageUrl }));
        showAlert.success('อัปโหลดรูปภาพสำเร็จ', 'บันทึกรูปภาพหน้าปกโครงการเรียบร้อยแล้ว');
        if (onProjectUpdated) onProjectUpdated();
      } else {
        showAlert.error('อัปโหลดไม่สำเร็จ', json.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
      }
    } catch (err: any) {
      showAlert.error('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingCover(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!project?.id) return;
    setIsSaving(true);
    try {
      const mergedDynamic = {
        ...parsedDynamic,
        ...formData,
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
          actual_spent: Number(formData.expenditure_performance) || 0,
        }),
      });

      // If PATCH not supported or 404, fallback to PUT
      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/v1/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            dynamic_data: JSON.stringify(mergedDynamic),
            actual_spent: Number(formData.expenditure_performance) || 0,
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        showAlert.success('บันทึกข้อมูลสำเร็จ', 'บันทึกข้อมูลสรุปโครงการเรียบร้อยแล้ว');
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

  const [isExportingDocx, setIsExportingDocx] = useState(false);

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
    dynamic_data: formData,
    actual_spent: formData.expenditure_performance,
    target_groups: {
      quantitative: formData.target_quantitative,
      qualitative: formData.target_qualitative,
    },
    objectives: formData.objectives,
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & View Switcher */}
      <div className="bg-white p-4 rounded-theme border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Switch Views */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-theme border border-slate-200">
          <button
            onClick={() => setActiveView('form')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme text-xs font-bold transition ${
              activeView === 'form'
                ? 'bg-theme-primary text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>แบบฟอร์มกรอกสรุปโครงการ</span>
          </button>

          <button
            onClick={() => setActiveView('one_page')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme text-xs font-bold transition ${
              activeView === 'one_page'
                ? 'bg-white text-theme-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-theme-primary" />
            <span>๑. สรุปแผ่นเดียว (One-Page)</span>
          </button>

          <button
            onClick={() => setActiveView('full_booklet')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme text-xs font-bold transition ${
              activeView === 'full_booklet'
                ? 'bg-white text-theme-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-theme-primary" />
            <span>๒. สรุปแบบรูปเล่ม (Full Booklet)</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeView !== 'form' && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-theme bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงาน</span>
            </button>
          )}

          <button
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

          {activeView === 'form' && (
            <button
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
                  <span>บันทึกข้อมูลสรุป</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {activeView === 'form' && (
        <div className="space-y-6">
          {/* แผ่นที่ 1: บันทึกข้อความ */}
          <div className="bg-white rounded-theme border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-theme-gradient p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-theme bg-white/20 flex items-center justify-center font-bold text-xs">๑</span>
                <div>
                  <h3 className="text-sm font-bold">แผ่นที่ ๑: บันทึกข้อความนำส่งรายงานสรุปโครงการ</h3>
                  <p className="text-[11px] text-slate-200">หนังสือนำส่งรายงานผลการดำเนินงานเสนอผู้บริหาร</p>
                </div>
              </div>
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-white/90 font-medium">บันทึกข้อความ</span>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ส่วนราชการ</label>
                  <input
                    type="text"
                    value={formData.memo_dept}
                    onChange={(e) => handleChange('memo_dept', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                    placeholder="เช่น แผนกวิชาเทคโนโลยีสารสนเทศ"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={formData.doc_date}
                    onChange={(e) => handleChange('doc_date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เรื่อง</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เนื้อหาย่อหน้า ๑ (เกริ่นนำ)</label>
                <textarea
                  rows={2}
                  value={formData.memo_paragraph1}
                  onChange={(e) => handleChange('memo_paragraph1', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เนื้อหาย่อหน้า ๒ (สรุปผลและนำส่ง)</label>
                <textarea
                  rows={2}
                  value={formData.memo_paragraph2}
                  onChange={(e) => handleChange('memo_paragraph2', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อผู้รายงาน (ลงนาม)</label>
                  <input
                    type="text"
                    value={formData.reporter_name}
                    onChange={(e) => handleChange('reporter_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={formData.reporter_position}
                    onChange={(e) => handleChange('reporter_position', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* แผ่นที่ 2: ปกรายงาน */}
          <div className="bg-white rounded-theme border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-theme-gradient p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-theme bg-white/20 flex items-center justify-center font-bold text-xs">๒</span>
                <div>
                  <h3 className="text-sm font-bold">แผ่นที่ ๒: ปกรายงานสรุปผลการดำเนินงานโครงการ</h3>
                  <p className="text-[11px] text-slate-200">หน้าปกรายงานฉบับสมบูรณ์</p>
                </div>
              </div>
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-white/90 font-medium">หน้าปกรูปเล่ม</span>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อโครงการ</label>
                  <input
                    type="text"
                    value={project?.title || ''}
                    disabled
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ปีงบประมาณ</label>
                  <input
                    type="text"
                    value={project?.fiscal_year || 2569}
                    disabled
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">รูปภาพหน้าปกโครงการ (Cover Image)</label>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {/* Image Preview or Placeholder */}
                  <div
                    className="w-full sm:w-56 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden relative group shrink-0"
                    style={{ aspectRatio: '4.8 / 3.3' }}
                  >
                    {formData.cover_image ? (
                      <>
                        <img
                          src={formData.cover_image}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = 'https://placehold.co/600x400/e2e8f0/475569?text=Cover+Image';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleChange('cover_image', '')}
                          className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-rose-700"
                          title="ลบรูปภาพ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400 font-medium">ยังไม่ได้เลือกรูปภาพ (4.8" x 3.3")</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls & URL input */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        className={`inline-flex items-center gap-1.5 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-theme text-xs font-bold cursor-pointer transition shadow-xs ${
                          uploadingCover ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingCover ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>กำลังอัปโหลด...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>เลือกไฟล์ภาพจากเครื่อง (Upload File)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverImageUpload}
                          disabled={uploadingCover}
                          className="hidden"
                        />
                      </label>

                      {formData.cover_image && (
                        <button
                          type="button"
                          onClick={() => handleChange('cover_image', '')}
                          className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                        >
                          ล้างรูปภาพ
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={formData.cover_image}
                        onChange={(e) => handleChange('cover_image', e.target.value)}
                        placeholder="หรือใส่ลิงก์ URL รูปภาพโดยตรง เช่น /storage/documents/... หรือ https://..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      * รองรับไฟล์รูปภาพ PNG, JPG, JPEG (ขนาดไม่เกิน 25MB) รูปภาพจะแสดงกึ่งกลางหน้าปกรายงานสรุปผล
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อผู้จัดทำ</label>
                  <input
                    type="text"
                    value={formData.reporter_name}
                    onChange={(e) => handleChange('reporter_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={formData.reporter_position}
                    onChange={(e) => handleChange('reporter_position', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">งาน / แผนกวิชา</label>
                  <input
                    type="text"
                    value={formData.department_name}
                    onChange={(e) => handleChange('department_name', e.target.value)}
                    placeholder="เช่น งานวางแผนและงบประมาณ / แผนกวิชาคอมพิวเตอร์ธุรกิจ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ฝ่ายที่สังกัด</label>
                  <select
                    value={formData.division_name}
                    onChange={(e) => handleChange('division_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 bg-white"
                  >
                    <option value="ฝ่ายวิชาการ">ฝ่ายวิชาการ</option>
                    <option value="ฝ่ายบริหารทรัพยากร">ฝ่ายบริหารทรัพยากร</option>
                    <option value="ฝ่ายพัฒนากิจการนักเรียน นักศึกษา">ฝ่ายพัฒนากิจการนักเรียน นักศึกษา</option>
                    <option value="ฝ่ายแผนงานและความร่วมมือ">ฝ่ายแผนงานและความร่วมมือ</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* แผ่นที่ 3: แบบรายงานผลการดำเนินงานโครงการ */}
          <div className="bg-white rounded-theme border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-theme-gradient p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-theme bg-white/20 flex items-center justify-center font-bold text-xs">๓</span>
                <div>
                  <h3 className="text-sm font-bold">แผ่นที่ ๓: แบบรายงานผลการดำเนินงานโครงการ</h3>
                  <p className="text-[11px] text-slate-200">รายละเอียดส่วนที่ ๑ ถึง ๔ และส่วนลงนาม</p>
                </div>
              </div>
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-white/90 font-medium">เนื้อหารายงาน</span>
            </div>

            <div className="p-5 sm:p-6 space-y-6 text-xs font-sans">
              {/* ส่วนที่ 1: ข้อมูลเบื้องต้น */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-theme-primary uppercase tracking-wider border-b border-theme-primary/20 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-theme-primary"></span>
                  ส่วนที่ ๑ ข้อมูลเบื้องต้น
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๑. ชื่อโครงการ</label>
                    <input
                      type="text"
                      value={project?.title || ''}
                      disabled
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๒. งาน/แผนก ที่รับผิดชอบ</label>
                    <input
                      type="text"
                      value={formData.department_name}
                      onChange={(e) => handleChange('department_name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๓. ฝ่ายที่รับผิดชอบ</label>
                    <select
                      value={formData.division_name}
                      onChange={(e) => handleChange('division_name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 bg-white"
                    >
                      <option value="ฝ่ายวิชาการ">ฝ่ายวิชาการ</option>
                      <option value="ฝ่ายบริหารทรัพยากร">ฝ่ายบริหารทรัพยากร</option>
                      <option value="ฝ่ายพัฒนากิจการนักเรียน นักศึกษา">ฝ่ายพัฒนากิจการนักเรียน นักศึกษา</option>
                      <option value="ฝ่ายแผนงานและความร่วมมือ">ฝ่ายแผนงานและความร่วมมือ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๔. การประกันคุณภาพการศึกษา (มาตรฐาน)</label>
                    <select
                      value={formData.qa_standard}
                      onChange={(e) => handleChange('qa_standard', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 bg-white"
                    >
                      <option value="มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์">มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์</option>
                      <option value="มาตรฐานที่ ๒ การจัดการอาชีวศึกษา">มาตรฐานที่ ๒ การจัดการอาชีวศึกษา</option>
                      <option value="มาตรฐานที่ ๓ การสร้างสังคมแห่งการเรียนรู้">มาตรฐานที่ ๓ การสร้างสังคมแห่งการเรียนรู้</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ประเด็นการประเมิน</label>
                    <input
                      type="text"
                      value={formData.qa_issue}
                      onChange={(e) => handleChange('qa_issue', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ด้านการประเมิน</label>
                    <input
                      type="text"
                      value={formData.qa_aspect}
                      onChange={(e) => handleChange('qa_aspect', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 2: ข้อมูลงาน / ผลการดำเนินงาน */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-blue-100 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-900"></span>
                  ส่วนที่ ๒ ข้อมูลงาน / ผลการดำเนินงาน
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <label className="font-bold text-slate-700">๑. วัตถุประสงค์งาน</label>
                      {proposalObjectives.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, objectives: proposalObjectives }));
                            showAlert.success('ดึงข้อมูลสำเร็จ', 'ดึงวัตถุประสงค์จากแบบเสนอโครงการเรียบร้อยแล้ว');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 font-semibold"
                          title="กดเพื่อดึงวัตถุประสงค์เดิมจากแบบเสนอโครงการมาแทนที่"
                        >
                          ↻ ดึงจากแบบเสนอ ({proposalObjectives.length} ข้อ)
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddObjective}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-900 hover:text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มวัตถุประสงค์
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.objectives.map((obj: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-4 text-center">{idx + 1}.</span>
                        <input
                          type="text"
                          value={obj}
                          onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                        />
                        {formData.objectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveObjective(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๒.๑ เป้าหมายเชิงปริมาณ</label>
                    <textarea
                      rows={2}
                      value={formData.target_quantitative}
                      onChange={(e) => handleChange('target_quantitative', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๒.๒ เป้าหมายเชิงคุณภาพ</label>
                    <textarea
                      rows={2}
                      value={formData.target_qualitative}
                      onChange={(e) => handleChange('target_qualitative', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๓. สถานะการดำเนินงาน</label>
                    <select
                      value={formData.operation_status}
                      onChange={(e) => handleChange('operation_status', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 bg-white"
                    >
                      <option value="ดำเนินงานแล้ว">ดำเนินงานแล้ว</option>
                      <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                      <option value="ยังไม่ได้ดำเนินการ">ยังไม่ได้ดำเนินการ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๕. ระยะเวลาปฏิบัติจริง (เริ่มต้น)</label>
                    <input
                      type="date"
                      value={formData.real_date_start}
                      onChange={(e) => handleChange('real_date_start', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๕. ระยะเวลาปฏิบัติจริง (สิ้นสุด)</label>
                    <input
                      type="date"
                      value={formData.real_date_end}
                      onChange={(e) => handleChange('real_date_end', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๖.๑ ผลการปฏิบัติงานเชิงปริมาณ (ผลจริง)</label>
                    <textarea
                      rows={2}
                      value={formData.actual_result_quantitative}
                      onChange={(e) => handleChange('actual_result_quantitative', e.target.value)}
                      placeholder="เช่น มีผู้เข้าร่วมจริงจำนวน ๖๕ คน (คิดเป็นร้อยละ ๑๐๘.๓๓)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">๖.๒ ผลการปฏิบัติงานเชิงคุณภาพ (ผลจริง)</label>
                    <textarea
                      rows={2}
                      value={formData.actual_result_qualitative}
                      onChange={(e) => handleChange('actual_result_qualitative', e.target.value)}
                      placeholder="เช่น ผู้เข้าร่วมมีความพึงพอใจในระดับมากที่สุด ค่าเฉลี่ย ๔.๘๕"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-slate-800 text-xs">๗. สรุปงบประมาณและการใช้จ่ายเงิน</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">งบตามแผนงาน (บาท)</label>
                      <input
                        type="text"
                        value={Number(project?.total_budget || 0).toLocaleString()}
                        disabled
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">งบได้รับจัดสรร (บาท)</label>
                      <input
                        type="number"
                        value={formData.allocated_budget}
                        onChange={(e) => handleChange('allocated_budget', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">ยอดใช้จ่ายจริง (บาท)</label>
                      <input
                        type="number"
                        value={formData.expenditure_performance}
                        onChange={(e) => handleChange('expenditure_performance', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900 font-bold text-blue-950"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">งบสนับสนุนอื่น (บาท)</label>
                      <input
                        type="number"
                        value={formData.other_budget}
                        onChange={(e) => handleChange('other_budget', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">๗.๑ ประเภทของเงินที่ใช้</label>
                      <select
                        value={formData.budget_fund_type}
                        onChange={(e) => handleChange('budget_fund_type', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                      >
                        <option value="เงินงบประมาณ">เงินงบประมาณ</option>
                        <option value="เงินรายได้สถานศึกษา">เงินรายได้สถานศึกษา</option>
                        <option value="เงินอุดหนุนโครงการสนับสนุนค่าใช้จ่ายในการจัดการศึกษาตั้งแต่ระดับอนุบาลจนจบการศึกษาขั้นพื้นฐาน">เงินอุดหนุนโครงการสนับสนุนค่าใช้จ่ายฯ (เรียนฟรี ๑๕ ปี)</option>
                        <option value="เงินอุดหนุนทั่วไป (งานวิจัย)">เงินอุดหนุนทั่วไป (งานวิจัย)</option>
                        <option value="เงินงบรายจ่ายอื่น">เงินงบรายจ่ายอื่น</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">๗.๒ ปริมาณการใช้เงิน</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.spending_status}
                          onChange={(e) => handleChange('spending_status', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                        >
                          <option value="ใช้เงินตามแผน">ใช้เงินตามแผน</option>
                          <option value="ใช้เงินต่ำกว่าแผน">ใช้เงินต่ำกว่าแผน</option>
                          <option value="ใช้เงินสูงกว่าแผน">ใช้เงินสูงกว่าแผน</option>
                        </select>
                        {formData.spending_status !== 'ใช้เงินตามแผน' && (
                          <input
                            type="number"
                            placeholder="จำนวนเงินต่าง (บาท)"
                            value={formData.spending_diff_amount}
                            onChange={(e) => handleChange('spending_diff_amount', e.target.value)}
                            className="w-36 px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 3: การประเมินผลของงาน */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-blue-100 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-900"></span>
                  ส่วนที่ ๓ การประเมินผลของงาน
                </h4>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">ระดับผลการประเมินโครงการ</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {['ยอดเยี่ยม', 'ดีเลิศ', 'ดี', 'ปานกลาง', 'กำลังพัฒนา'].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleChange('evaluation_rating', rate)}
                        className={'p-2.5 rounded-theme border text-center font-bold text-xs transition ' + (
                          formData.evaluation_rating === rate
                            ? 'bg-theme-primary text-white border-theme-primary shadow-xs ring-2 ring-theme-primary/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        {rate}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 4: สภาพปัญหา อุปสรรค และข้อคิดเห็น */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-theme-primary uppercase tracking-wider border-b border-theme-primary/20 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-theme-primary"></span>
                  ส่วนที่ ๔ สภาพปัญหา อุปสรรคของงาน และข้อคิดเห็น
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700">สภาพปัญหา และอุปสรรค</label>
                    <button
                      type="button"
                      onClick={handleAddProblem}
                      className="flex items-center gap-1 text-[11px] font-bold text-theme-primary hover:text-theme-primary-hover"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มปัญหาอุปสรรค
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.problems_obstacles.map((prob: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-4 text-center">{idx + 1}.</span>
                        <input
                          type="text"
                          value={prob}
                          onChange={(e) => handleProblemChange(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                        />
                        {formData.problems_obstacles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProblem(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">จุดเด่นของโครงการ</label>
                    <textarea
                      rows={2}
                      value={formData.project_strengths}
                      onChange={(e) => handleChange('project_strengths', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">จุดด้อย / สิ่งที่ควรปรับปรุง</label>
                    <textarea
                      rows={2}
                      value={formData.project_weaknesses}
                      onChange={(e) => handleChange('project_weaknesses', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ข้อเสนอแนะ</label>
                  <textarea
                    rows={2}
                    value={formData.project_suggestions}
                    onChange={(e) => handleChange('project_suggestions', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">การเผยแพร่ข้อมูลผลงาน</label>
                    <select
                      value={formData.dissemination_channel}
                      onChange={(e) => handleChange('dissemination_channel', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition bg-white"
                    >
                      <option value="เอกสารสิ่งพิมพ์">เอกสารสิ่งพิมพ์</option>
                      <option value="แผ่นพับ">แผ่นพับ</option>
                      <option value="เว็บไซต์">เว็บไซต์</option>
                      <option value="ติดประกาศ">ติดประกาศ</option>
                      <option value="นิทรรศการ">นิทรรศการ</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  {formData.dissemination_channel === 'อื่นๆ' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ระบุช่องทางการเผยแพร่อื่น</label>
                      <input
                        type="text"
                        value={formData.dissemination_other}
                        onChange={(e) => handleChange('dissemination_other', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Save Bar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition transform active:scale-98"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>บันทึกข้อมูลสรุปโครงการ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView !== 'form' && (
        <div className="bg-slate-200/60 p-4 sm:p-8 rounded-2xl border border-slate-200 flex justify-center overflow-x-auto print:bg-white print:p-0 print:border-none">
          {activeView === 'one_page' ? (
            <OnePageSummaryReport
              project={mergedProjectForPreview}
              collegeName={collegeName}
              directorName={directorName}
              directorPosition={directorPosition}
            />
          ) : (
            <FullBookletReport
              project={mergedProjectForPreview}
              collegeName={collegeName}
              directorName={directorName}
              directorPosition={directorPosition}
            />
          )}
        </div>
      )}
    </div>
  );
}
