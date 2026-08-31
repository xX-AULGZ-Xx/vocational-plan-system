'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ClipboardCheck,
  QrCode,
  Link2,
  Copy,
  ExternalLink,
  Download,
  Settings2,
  RefreshCw,
  Plus,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  PieChart,
  MessageSquare,
  Sparkles,
  Power,
  Trash2,
  Check,
  ChevronDown,
  Palette,
  Type
} from 'lucide-react';
import { showAlert } from '@/lib/sweetalert';
import { getSurveyTheme } from '@/lib/survey-themes';
import EvaluationFormEditor from './EvaluationFormEditor';

interface EvaluationTabProps {
  projectId: string;
  project: any;
  token: string | null;
  user: any;
}

export default function EvaluationTab({ projectId, project, token, user }: EvaluationTabProps) {
  const [loading, setLoading] = useState(true);
  const [resultsData, setResultsData] = useState<any>(null);
  const [formMeta, setFormMeta] = useState<any>(null);
  const [hasForm, setHasForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const qrRef = useRef<SVGSVGElement>(null);

  // Determine public survey URL
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const surveyUrl = formMeta?.id ? `${origin}/surveys/${formMeta.id}` : '';

  useEffect(() => {
    if (projectId && token) {
      loadEvaluation();
    }
  }, [projectId, token]);

  const loadEvaluation = async () => {
    setLoading(true);
    try {
      // 1. Fetch form info
      const resForm = await fetch(`/api/v1/projects/${projectId}/evaluation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataForm = await resForm.json();

      if (dataForm.success && dataForm.has_form) {
        setHasForm(true);
        setFormMeta(dataForm.data);

        // 2. Fetch results and statistics
        const resResults = await fetch(`/api/v1/projects/${projectId}/evaluation/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataResults = await resResults.json();
        if (dataResults.success) {
          setResultsData(dataResults.data);
        }
      } else {
        setHasForm(false);
        setFormMeta(null);
        setResultsData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefaultForm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/evaluation/init-default`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success('สร้างแบบประเมินสำเร็จ', 'ระบบได้สร้างแบบประเมินมาตรฐานอาชีวศึกษาให้เรียบร้อยแล้ว');
        loadEvaluation();
      } else {
        showAlert.error('เกิดข้อผิดพลาด', data.message);
      }
    } catch (e) {
      showAlert.error('ข้อผิดพลาด', 'ไม่สามารถสร้างแบบประเมินได้');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/evaluation/toggle-status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFormMeta((prev: any) => ({ ...prev, is_active: data.is_active }));
        if (resultsData) {
          setResultsData((prev: any) => ({ ...prev, is_active: data.is_active }));
        }
        showAlert.success('สถานะ', data.message);
      } else {
        showAlert.error('เกิดข้อผิดพลาด', data.message);
      }
    } catch (e) {
      showAlert.error('ข้อผิดพลาด', 'ไม่สามารถเปลี่ยนสถานะได้');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleCopyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    showAlert.success('คัดลอกลิงก์สำเร็จ', 'คัดลอกลิงก์แบบประเมินไปยังคลิปบอร์ดแล้ว');
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 50, 50, 900, 900);
        const png = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QRCode-Evaluation-${project?.project_code || 'Project'}.png`;
        downloadLink.href = png;
        downloadLink.click();
      }
    };
    image.src = blobURL;
  };

  const handleResetResponses = async () => {
    const confirmed = await showAlert.confirm(
      'ล้างข้อมูลการประเมินทั้งหมด?',
      'คุณต้องการล้างผลการตอบแบบประเมินทั้งหมดที่มีอยู่ใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/evaluation/responses`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success('ล้างข้อมูลสำเร็จ', data.message);
        loadEvaluation();
      } else {
        showAlert.error('เกิดข้อผิดพลาด', data.message);
      }
    } catch (e) {
      showAlert.error('ข้อผิดพลาด', 'ไม่สามารถล้างข้อมูลได้');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลระบบประเมินความพึงพอใจ...</p>
      </div>
    );
  }

  // If no evaluation form is created yet
  if (!hasForm) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 space-y-6">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
          <ClipboardCheck className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-800">ยังไม่มีแบบประเมินความพึงพอใจสำหรับโครงการนี้</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            สร้างแบบประเมินเพื่อเปิดรับความคิดเห็นจากผู้เข้าร่วมกิจกรรมผ่าน QR Code และประมวลผลค่าสถิติ (ค่าเฉลี่ย X̄, S.D.) สำหรับจัดทำรายงานสรุปโครงการ
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleCreateDefaultForm}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white font-semibold text-sm rounded-theme shadow-md transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" />
            <span>สร้างแบบประเมินมาตรฐาน (3 ตอน 9 ตัวชี้วัด)</span>
          </button>
        </div>
      </div>
    );
  }

  const overall = resultsData?.overall_stats || { count: 0, mean: 0, sd: 0, level: '-' };
  const totalResp = resultsData?.total_responses || 0;
  const targetResp = resultsData?.target_responses || 50;
  const percentTarget = targetResp > 0 ? Math.min(Math.round((totalResp / targetResp) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Share Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Share & QR Code Card */}
        <div className="bg-theme-gradient text-white p-6 rounded-theme shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-white/90">
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code สแกนประเมิน</span>
              </span>
              
              {/* Status Badge */}
              <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                formMeta.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${formMeta.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {formMeta.is_active ? 'เปิดรับข้อมูล' : 'ปิดรับข้อมูล'}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-theme shadow-xl w-fit mx-auto my-3 flex flex-col items-center">
              <QRCodeSVG
                ref={qrRef}
                value={surveyUrl}
                size={160}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            <p className="text-center text-xs text-white/80 font-light mt-1">
              สแกนผ่านกล้องสมาร์ตโฟนหรือแอป LINE
            </p>
          </div>

          <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-theme text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 rounded-theme text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด QR</span>
              </button>
            </div>

            <a
              href={surveyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 rounded-theme text-[11px] text-white/90 flex items-center justify-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>เปิดหน้าแบบประเมินเพื่อทดสอบ</span>
            </a>
          </div>
        </div>

        {/* Evaluation Summary Analytics & Controls */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-theme border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
          
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-theme-primary" />
                  <span>ผลการประเมินความพึงพอใจ</span>
                </h3>
                {(() => {
                  const t = getSurveyTheme(formMeta?.theme_config);
                  return (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${t.color.badgeClass}`}>
                        🎨 {t.color.name.split(' (')[0]}
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        🔤 {t.font.name.split(' (')[0]}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{formMeta.title}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                className={`px-3 py-1.5 rounded-theme text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  formMeta.is_active
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{formMeta.is_active ? 'ปิดรับคำตอบ' : 'เปิดรับคำตอบ'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEditor(true)}
                className="px-3.5 py-1.5 rounded-theme text-xs font-semibold bg-theme-primary-light text-theme-primary border border-theme-primary/20 hover:bg-theme-primary hover:text-white flex items-center gap-1.5 transition-all"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>ปรับแต่งคำถาม & ธีม</span>
              </button>

              <button
                type="button"
                onClick={loadEvaluation}
                className="p-1.5 rounded-theme text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Key KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Responses */}
            <div className="bg-slate-50 p-4 rounded-theme border border-slate-100">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">จำนวนผู้ตอบ</span>
                <Users className="w-4 h-4 text-theme-primary" />
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {totalResp}{' '}
                <span className="text-xs font-normal text-slate-400">/ {targetResp} คน</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-theme-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentTarget}%` }}
                />
              </div>
            </div>

            {/* Mean Rating */}
            <div className="bg-theme-primary-light p-4 rounded-theme border border-theme-primary/20">
              <div className="flex items-center justify-between text-theme-primary mb-1">
                <span className="text-xs font-semibold">ค่าเฉลี่ย (X̄)</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {overall.mean > 0 ? overall.mean.toFixed(2) : '-'}
                <span className="text-xs font-normal text-slate-500"> / 5.00</span>
              </div>
              <div className="text-[11px] font-bold text-theme-primary mt-1">
                ร้อยละ {resultsData?.satisfaction_percentage || 0}%
              </div>
            </div>

            {/* Standard Deviation */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center justify-between text-purple-600 mb-1">
                <span className="text-xs font-semibold">ส่วนเบี่ยงเบน (S.D.)</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {overall.sd !== undefined && overall.sd !== null ? overall.sd.toFixed(2) : '-'}
              </div>
              <div className="text-[11px] font-medium text-purple-700 mt-1">
                การกระจายตัวของข้อมูล
              </div>
            </div>

            {/* Quality Level */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-xs font-semibold">ระดับคุณภาพ</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-emerald-800 truncate">
                {overall.level || '-'}
              </div>
              <div className="text-[11px] font-medium text-emerald-700 mt-1">
                เกณฑ์มาตรฐาน
              </div>
            </div>

          </div>

          {/* Demographics Overview if any */}
          {resultsData?.demographics && Object.keys(resultsData.demographics).length > 0 && (
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                <span>สรุปสัดส่วนข้อมูลทั่วไปของผู้ตอบแบบประเมิน</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(resultsData.demographics).map(([key, demo]: any) => (
                  <div key={key} className="bg-white p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="font-semibold text-slate-800 mb-2 truncate">{demo.title}</div>
                    <div className="space-y-1.5">
                      {Object.entries(demo.counts).map(([label, count]: any) => {
                        const pct = demo.total > 0 ? Math.round((count / demo.total) * 100) : 0;
                        return (
                          <div key={label} className="flex items-center justify-between gap-2 text-slate-600">
                            <span className="truncate">{label}:</span>
                            <span className="font-semibold text-slate-800">{count} คน ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Detailed Statistical Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="text-base font-bold text-slate-800">
              ตารางวิเคราะห์สถิติความพึงพอใจรายข้อและรายด้าน
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงค่าเฉลี่ย (X̄), ส่วนเบี่ยงเบนมาตรฐาน (S.D.) และระดับความพึงพอใจตามเกณฑ์มาตรฐาน
            </p>
          </div>

          {totalResp > 0 && (
            <button
              type="button"
              onClick={handleResetResponses}
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างผลการตอบ</span>
            </button>
          )}
        </div>

        {totalResp === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">ยังไม่มีผู้ตอบแบบประเมิน</p>
            <p className="text-xs text-slate-400 mt-1">
              แชร์ลิงก์หรือแสดง QR Code ให้ผู้เข้าร่วมโครงการเพื่อเริ่มเก็บข้อมูล
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                  <th className="py-3 px-4">รายการประเมิน / ประเด็น</th>
                  <th className="py-3 px-3 text-center w-24">คะแนนเฉลี่ย (X̄)</th>
                  <th className="py-3 px-3 text-center w-20">S.D.</th>
                  <th className="py-3 px-4 text-center w-28">ระดับความพึงพอใจ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultsData?.sections?.map((sec: any, sIdx: number) => (
                  <React.Fragment key={sec.id}>
                    {/* Section Header Row */}
                    <tr className="bg-theme-primary-light font-bold text-slate-800">
                      <td className="py-2.5 px-4 text-center text-theme-primary">{sIdx + 1}</td>
                      <td className="py-2.5 px-4">{sec.title}</td>
                      <td className="py-2.5 px-3 text-center text-theme-primary">
                        {sec.stats.mean > 0 ? sec.stats.mean.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {sec.stats.sd !== undefined ? sec.stats.sd.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-theme-primary">
                        {sec.stats.level}
                      </td>
                    </tr>

                    {/* Questions in section */}
                    {sec.questions
                      .filter((q: any) => q.question_type === 'RATING_5')
                      .map((q: any, qIdx: number) => (
                        <tr key={q.id} className="hover:bg-slate-50/70 text-slate-700 transition-colors">
                          <td className="py-2.5 px-4 text-center text-slate-400">{sIdx + 1}.{qIdx + 1}</td>
                          <td className="py-2.5 px-4 pl-8">{q.question_text}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-900">
                            {q.stats.mean > 0 ? q.stats.mean.toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {q.stats.sd !== undefined ? q.stats.sd.toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              q.stats.level === 'มากที่สุด'
                                ? 'bg-emerald-100 text-emerald-800'
                                : q.stats.level === 'มาก'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {q.stats.level}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}

                {/* Overall Summary Row */}
                <tr className="bg-theme-primary text-white font-bold text-sm">
                  <td colSpan={2} className="py-3 px-4 text-right">
                    สรุปผลการประเมินในภาพรวมทั้งโครงการ
                  </td>
                  <td className="py-3 px-3 text-center">
                    {overall.mean > 0 ? overall.mean.toFixed(2) : '-'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {overall.sd !== undefined ? overall.sd.toFixed(2) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-200">
                    {overall.level}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open-ended Feedback / Suggestions Cards */}
      {resultsData?.sections?.some((sec: any) =>
        sec.questions.some((q: any) => q.question_type === 'TEXT' && q.comments?.length > 0)
      ) && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h4 className="text-base font-bold">ข้อคิดเห็นและข้อเสนอแนะเพิ่มเติมจากผู้ประเมิน</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resultsData.sections.map((sec: any) =>
              sec.questions
                .filter((q: any) => q.question_type === 'TEXT' && q.comments?.length > 0)
                .map((q: any) => (
                  <div key={q.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{q.question_text}</span>
                      <span className="text-indigo-600 font-normal text-[11px]">{q.comments.length} ความคิดเห็น</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {q.comments.map((comment: string, cIdx: number) => (
                        <div key={cIdx} className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-xs text-slate-600 leading-relaxed shadow-2xs">
                          "{comment}"
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <EvaluationFormEditor
          projectId={projectId}
          token={token}
          initialData={formMeta}
          onClose={() => setShowEditor(false)}
          onSaved={() => {
            setShowEditor(false);
            loadEvaluation();
          }}
        />
      )}
    </div>
  );
}
