'use client';

import React, { useState, useEffect } from 'react';
import { DocxScanResult } from '@/lib/docx-scanner';
import DynamicDocxViewer from '@/components/preview/DynamicDocxViewer';
import { Loader2, Sparkles, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import A4DocumentPreview from '@/components/preview/A4DocumentPreview';

interface FullBookletProps {
  project: any;
  collegeName?: string;
  directorName?: string;
  directorPosition?: string;
}

export default function FullBookletReport({
  project,
  collegeName = 'วิทยาลัยการอาชีพเชียงราย',
  directorName = 'นางปิยะพร พูลเพิ่ม',
  directorPosition = 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย',
}: FullBookletProps) {
  const [scanResult, setScanResult] = useState<DocxScanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const totalBudget = Number(project?.total_budget || 0);
  const deptName = project?.department?.name || 'แผนกวิชาเทคโนโลยีสารสนเทศ';
  const divName = project?.department?.division?.name || 'ฝ่ายวิชาการ';
  const leaderName = project?.leader?.full_name || 'อาจารย์สมชาย ใจดี';
  const leaderPos = project?.leader?.position || 'ครู';
  const timelines = project?.timelines || [];
  const firstTimeline = timelines[0];
  const lastTimeline = timelines[timelines.length - 1];
  const locationFull = firstTimeline?.location || collegeName;
  const startDateThai = firstTimeline?.start_date
    ? new Date(firstTimeline.start_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '๑ กันยายน ๒๕๖๙';
  const endDateThai = lastTimeline?.end_date
    ? new Date(lastTimeline.end_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '๓๐ กันยายน ๒๕๖๙';
  const todayThai = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  // Map project values to all possible template variables
  const variablesData: Record<string, string | number> = {
    project_name: project?.title || '',
    title: project?.title || '',
    fiscal_year: project?.fiscal_year || 2569,
    department_name: deptName,
    sub_division: divName,
    division_name: divName,
    college_name: collegeName,
    leader_name: leaderName,
    leader_position: leaderPos,
    responsible_person: leaderName,
    responsible_position: leaderPos,
    rationale: project?.background ? project.background.slice(0, 180) + '...' : 'พัฒนาทักษะและเสริมสร้างสมรรถนะวิชาชีพ',
    background: project?.background || '',
    start_date: startDateThai,
    end_date: endDateThai,
    doc_date_full: todayThai,
    today_thai: todayThai,
    location_full: locationFull,
    total_budget: totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    director_name: directorName,
    director_position: directorPosition,
    cover_image: project?.dynamic_data?.cover_image || (typeof project?.dynamic_data === 'string' ? JSON.parse(project.dynamic_data || '{}')?.cover_image : '') || '',
  };

  useEffect(() => {
    if (!project?.id) return;
    let isMounted = true;

    async function fetchScan() {
      try {
        setIsLoading(true);
        const token = typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : '';
        const res = await fetch(`/api/v1/projects/${project.id}/summary-template-scan`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data?.scanResult) {
            setScanResult(json.data.scanResult);
          } else {
            setError(json.message || 'ไม่สามารถสแกนไฟล์แม่แบบได้');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'เกิดข้อผิดพลาดในการโหลดโครงสร้างเอกสาร');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchScan();
    return () => {
      isMounted = false;
    };
  }, [project?.id]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-600 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="font-bold text-slate-800">กำลังสแกนโครงสร้างและตัวแปรในไฟล์แม่แบบ Word...</p>
          <p className="text-xs text-slate-500 mt-1">กำลังคำนวณตำแหน่ง, ฟอนต์, ย่อหน้า และขนาดรูปภาพ ๑๐๐%</p>
        </div>
      </div>
    );
  }

  if (scanResult && scanResult.pages.length > 0) {
    return (
      <div className="space-y-6 w-full max-w-[210mm] mx-auto">
        {/* Info banner showing scanned variables */}
        <div className="no-print p-3 bg-blue-900 text-white rounded-xl flex items-center justify-between text-xs font-sans shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>สแกนไฟล์แม่แบบอัตโนมัติสำเร็จ:</strong> พบตัวแปร {scanResult.variables.length} ตัวแปร ({scanResult.variables.map(v => `{${v}}`).join(', ')}) • จำนวน {scanResult.totalPages} หน้า
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            จำลองโครงสร้าง Word 100%
          </span>
        </div>

        {/* Dynamic Renderer */}
        <DynamicDocxViewer
          scanResult={scanResult}
          variablesData={variablesData}
          fallbackImages={{
            rId8: '/template-media/image1.jpeg',
            rId9: '/template-media/image2.jpg',
          }}
        />

        {/* Standard Proposal Attachment */}
        <div className="space-y-6 pt-4">
          <div className="no-print p-3 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm font-sans">
            <FileText className="w-4 h-4 text-amber-300" />
            <span>เอกสารแนบ: แบบเสนอโครงการฉบับเต็มที่ผ่านการอนุมัติ (Proposal Standard Form ๔ หน้า)</span>
          </div>

          <A4DocumentPreview
            data={{
              title: project.title,
              fiscal_year: project.fiscal_year,
              college_name: collegeName,
              department_name: deptName,
              division_name: divName,
              leader_name: leaderName,
              leader_position: leaderPos,
              background: project.background,
              objectives: project.objectives || [],
              target_quantitative: project.target_groups?.quantitative,
              target_qualitative: project.target_groups?.qualitative,
              expected_results: project.expected_results,
              monitoring_evaluation: project.monitoring_evaluation,
              timelines: project.timelines || [],
              budget_items: project.budget_items || [],
              project_code: project.project_code,
            }}
            zoom={1}
          />
        </div>
      </div>
    );
  }

  // Fallback if scanner encountered an error
  return (
    <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 font-sans">
      <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
      <p className="font-bold">เกิดข้อผิดพลาดในการสแกนไฟล์แม่แบบ</p>
      <p className="text-xs text-amber-700 mt-1">{error || 'ไม่พบโครงสร้างเอกสาร'}</p>
    </div>
  );
}
