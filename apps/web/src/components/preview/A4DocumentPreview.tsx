'use client';

import React, { useState, useEffect } from 'react';
import { formatThaiBaht } from '@/lib/bahttext';
import {
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  BookOpen,
  CheckSquare,
  Square,
  Award,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface ProjectFormData {
  title: string;
  fiscal_year: number;
  template_id?: number | null;
  template_name?: string;
  college_name?: string;
  department_name?: string;
  division_name?: string;
  leader_name?: string;
  leader_position?: string;
  project_nature?: string;
  national_strategy?: string;
  nesdc_plan13?: string;
  moe_policy?: string;
  ovec_policy_agenda?: string;
  college_mission?: string;
  qa_standard?: string;
  background: string;
  objectives: string[];
  target_quantitative: string;
  target_qualitative: string;
  expected_results: string;
  monitoring_evaluation?: string;
  endorser_name?: string;
  endorser_position?: string;
  planning_head_name?: string;
  planning_head_position?: string;
  deputy_strat_name?: string;
  deputy_strat_position?: string;
  director_name?: string;
  director_position?: string;
  timelines: Array<{
    activity_name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    location?: string;
    is_milestone?: boolean;
  }>;
  budget_items: Array<{
    category_id?: number;
    category_name?: string;
    description: string;
    quantity: number | string;
    unit: string;
    unit_price: number | string;
    total_amount?: number;
  }>;
  approvals?: Array<{
    step_order: number;
    status: string;
    action_by?: string;
    action_date?: string;
    comments?: string;
  }>;
  project_code?: string;
  mappings?: Record<string, string>;
  custom_fields?: Record<string, string>;
}

function formatThaiDistributed(text: string): string {
  if (!text) return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter('th', { granularity: 'word' });
      const segments = Array.from(segmenter.segment(text)).map((s: any) => s.segment);
      return segments.join('\u200B');
    } catch {
      return text;
    }
  }
  return text;
}

interface Props {
  data: ProjectFormData;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showPrint?: boolean;
  forcedTemplateType?: 'proposal' | 'summary';
}

export default function A4DocumentPreview({
  data,
  zoom = 0.85,
  onZoomChange,
  showPrint = true,
  forcedTemplateType,
}: Props) {
  // Determine template mode: 'summary' (8 pages) or 'proposal' (4 pages) based on selected template
  const isSummaryTemplate = data.template_name
    ? data.template_name.includes('สรุป') || data.template_name.includes('รายงานผล') || data.template_name.toLowerCase().includes('summary')
    : false;

  const templateType: 'proposal' | 'summary' = forcedTemplateType || (isSummaryTemplate ? 'summary' : 'proposal');

  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  useEffect(() => {
    if (zoom !== undefined) {
      setCurrentZoom(zoom);
    }
  }, [zoom]);

  const handleZoom = (newZoom: number) => {
    const rounded = Number(newZoom.toFixed(2));
    setCurrentZoom(rounded);
    if (onZoomChange) {
      onZoomChange(rounded);
    }
  };

  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [displayMode, setDisplayMode] = useState<'all' | 'single'>('all');
  const [viewEngine, setViewEngine] = useState<'docx' | 'interactive'>('docx');
  const [loadingDocx, setLoadingDocx] = useState<boolean>(true);
  const [docxError, setDocxError] = useState<string | null>(null);

  const docxContainerRef = React.useRef<HTMLDivElement>(null);

  // Debounced live render directly from real Word template
  useEffect(() => {
    let isCancelled = false;

    const renderRealDocx = async () => {
      if (!docxContainerRef.current) return;
      setLoadingDocx(true);
      setDocxError(null);

      try {
        const res = await fetch('/api/v1/projects/render-docx-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: data.template_id,
            formData: data,
          }),
        });

        if (!res.ok) {
          throw new Error('ไม่สามารถสร้างตัวอย่างจากไฟล์แม่แบบ Word ได้');
        }

        const arrayBuffer = await res.arrayBuffer();
        if (isCancelled) return;

        // Render with docx-preview directly into container
        const docxPreview = await import('docx-preview');
        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = '';
          await docxPreview.renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
            className: 'docx-preview-doc',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
          });
        }
      } catch (err: any) {
        console.warn('Docx live preview notice:', err);
        if (!isCancelled) {
          setDocxError(err.message || 'แสดงผลตัวอย่างจากแม่แบบจำลอง');
        }
      } finally {
        if (!isCancelled) {
          setLoadingDocx(false);
        }
      }
    };

    const timer = setTimeout(() => {
      renderRealDocx();
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    data.template_id,
    data.title,
    data.leader_name,
    data.leader_position,
    data.project_nature,
    data.national_strategy,
    data.nesdc_plan13,
    data.moe_policy,
    data.ovec_policy_agenda,
    data.college_mission,
    data.qa_standard,
    data.background,
    data.target_quantitative,
    data.target_qualitative,
    data.expected_results,
    data.monitoring_evaluation,
    data.fiscal_year,
    data.division_name,
    data.department_name,
    JSON.stringify(data.objectives),
    JSON.stringify(data.timelines),
    JSON.stringify(data.budget_items),
  ]);

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const now = new Date();
  const todayThaiFull = `${now.getDate()} ${thaiMonths[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;

  const firstTimeline = data.timelines && data.timelines[0] ? data.timelines[0] : null;
  const lastTimeline = data.timelines && data.timelines[data.timelines.length - 1] ? data.timelines[data.timelines.length - 1] : null;

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.getDate()} ${thaiMonths[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
    } catch {
      return dateStr;
    }
  };

  const startDateThai = firstTimeline?.start_date ? formatThaiDate(firstTimeline.start_date) : '';
  const endDateThai = lastTimeline?.end_date ? formatThaiDate(lastTimeline.end_date) : '';
  const locationFull = firstTimeline?.location || data.college_name || 'วิทยาลัยการอาชีพเชียงราย';

  const divName = data.division_name || '';
  const deptName = data.department_name || '';
  const projectTitle = data.title || '....................................................................................................................';
  const leaderName = data.leader_name || '...................................................';
  const leaderPos = data.leader_position || 'ครู';
  const fiscalYear = data.fiscal_year || 2569;

  const totalBudget = (data.budget_items || []).reduce((acc, item) => {
    const qty = parseFloat(String(item.quantity)) || 0;
    const price = parseFloat(String(item.unit_price)) || 0;
    return acc + (qty * price);
  }, 0);

  const totalBudgetText = totalBudget > 0 ? totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00';
  const bahtText = totalBudget > 0 ? formatThaiBaht(totalBudget) : '';

  const totalPages = templateType === 'proposal' ? 4 : 8;

  // =========================================================================
  // PROPOSAL TEMPLATE (5 PAGES) - แบบเสนอขออนุมัติโครงการ
  // =========================================================================

  // Proposal Page 1: ชื่อโครงการ, ผู้รับผิดชอบ, ลักษณะโครงการ, ยุทธศาสตร์ (๓.๑ - ๓.๔)
  const renderProposalPage1 = () => {
    const curNature = data.project_nature || 'โครงการตาม พ.ร.บ. งบประมาณ';
    const curNat = data.national_strategy || 'ยุทธศาสตร์การพัฒนาและเสริมสร้างศักยภาพคน';
    const curNesdc = data.nesdc_plan13 || 'ไทยมีกำลังคนสมรรถนะสูงมุ่งเรียนรู้อย่างต่อเนื่องตอบโจทย์การพัฒนาแห่งอนาคต';
    const curMoe = data.moe_policy || 'ลดภาระครูและบุคลากรทางการศึกษา';
    const curOvec = data.ovec_policy_agenda || 'ปฏิรูประบบอาชีวศึกษาและพัฒนาคุณภาพการศึกษา';

    return (
      <div className="space-y-3 text-slate-950 leading-[1.1] select-text text-[16pt] font-['TH_SarabunIT๙','TH_Sarabun_New',sans-serif]">
        <div className="text-left font-bold text-[18pt] pb-1">
          {data.mappings?.title || 'ชื่อโครงการ'} <span className="font-normal text-slate-900">{projectTitle}</span>
        </div>

        <div className="space-y-2">
          <div>
            <span className="font-bold text-[16pt]">{data.mappings?.leader_name ? `๑. ${data.mappings.leader_name}` : '๑. ผู้รับผิดชอบโครงการ'}</span>{' '}
            <span className="font-normal">{leaderName}</span>
          </div>

          <div>
            <div className="flex items-start">
              <span className="font-bold text-[16pt] shrink-0 w-44">{data.mappings?.project_nature || '๒. ลักษณะโครงการ'}</span>
              <div className="space-y-1 text-[15pt]">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-base ${curNature.includes('พ.ร.บ.') ? 'font-bold text-blue-900' : ''}`}>
                    {curNature.includes('พ.ร.บ.') ? '☑' : '☐'}
                  </span>
                  <span>โครงการตาม พ.ร.บ. งบประมาณ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-base ${curNature.includes('ภาระงานปกติ') ? 'font-bold text-blue-900' : ''}`}>
                    {curNature.includes('ภาระงานปกติ') ? '☑' : '☐'}
                  </span>
                  <span>โครงการตามภาระงานปกติ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-base ${curNature.includes('นโยบาย สอศ.') ? 'font-bold text-blue-900' : ''}`}>
                    {curNature.includes('นโยบาย สอศ.') ? '☑' : '☐'}
                  </span>
                  <span>โครงการตามนโยบาย สอศ.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-base ${curNature.includes('พิเศษ') ? 'font-bold text-blue-900' : ''}`}>
                    {curNature.includes('พิเศษ') ? '☑' : '☐'}
                  </span>
                  <span>โครงการพิเศษ ไม่ใช้ งบประมาณ สอศ.</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="font-bold text-[16pt]">๓. ความสอดคล้องกับนโยบาย ยุทธศาสตร์ และกลยุทธ์</span>

            {/* 3.1 ยุทธศาสตร์ชาติ 20 ปี */}
            <div className="pl-4 pt-1 space-y-1">
              <span className="font-bold text-[15pt]">{data.mappings?.national_strategy || '๓.๑ ความสอดคล้องกับยุทธศาสตร์ชาติ ๒๐ ปี'}</span>
              <div className="pl-4 space-y-0.5 text-[14pt]">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNat.includes('ความมั่นคง') ? '☑' : '☐'}</span> <span>ยุทธศาสตร์ด้านความมั่นคง</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNat.includes('ความสามารถในการแข่งขัน') ? '☑' : '☐'}</span> <span>ยุทธศาสตร์ด้านการสร้างความสามารถในการแข่งขัน</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${curNat.includes('ศักยภาพคน') ? 'text-blue-900 font-bold' : ''}`}>{curNat.includes('ศักยภาพคน') ? '☑' : '☐'}</span> <span className={curNat.includes('ศักยภาพคน') ? 'font-semibold text-blue-950' : ''}>ยุทธศาสตร์การพัฒนาและเสริมสร้างศักยภาพคน</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNat.includes('ความเสมอภาค') ? '☑' : '☐'}</span> <span>ยุทธศาสตร์ด้านการสร้างโอกาสความเสมอภาคและเท่าเทียมกันทางสังคม</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNat.includes('คุณภาพชีวิต') ? '☑' : '☐'}</span> <span>ยุทธศาสตร์ด้านการสร้างการเติบโตบนคุณภาพชีวิตที่เป็นมิตรกับสิ่งแวดล้อม</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNat.includes('ปรับสมดุล') ? '☑' : '☐'}</span> <span>ยุทธศาสตร์ด้านการปรับสมดุลและพัฒนาระบบการบริหารจัดการภาครัฐ</span>
                </div>
              </div>
            </div>

            {/* 3.2 แผนพัฒนาเศรษฐกิจฯ ฉบับที่ 13 */}
            <div className="pl-4 pt-2 space-y-1">
              <span className="font-bold text-[15pt]">{data.mappings?.nesdc_plan13 || '๓.๒ ความสอดคล้องกับแผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ ฉบับที่ ๑๓'}</span>
              <div className="pl-4 space-y-0.5 text-[14pt]">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNesdc.includes('ยานยนต์ไฟฟ้า') ? '☑' : '☐'}</span> <span>ไทยเป็นฐานการผลิตยานยนต์ไฟฟ้าของอาเซียน</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNesdc.includes('อิเล็กทรอนิกส์') ? '☑' : '☐'}</span> <span>ไทยเป็นฐานการผลิตอิเล็กทรอนิกส์อัจฉริยะและบริการดิจิทัลอาเซียน</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curNesdc.includes('โลจิสติกส์') ? '☑' : '☐'}</span> <span>ไทยเป็นประตูการค้าการลงทุนและจุดยุทธศาสตร์ทางโลจิสติกส์ที่สำคัญของภูมิภาค</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${curNesdc.includes('กำลังคน') ? 'text-blue-900 font-bold' : ''}`}>{curNesdc.includes('กำลังคน') ? '☑' : '☐'}</span> <span className={curNesdc.includes('กำลังคน') ? 'font-semibold text-blue-950' : ''}>ไทยมีกำลังคนสมรรถนะสูงมุ่งเรียนรู้อย่างต่อเนื่องตอบโจทย์การพัฒนาแห่งอนาคต</span>
                </div>
              </div>
            </div>

            {/* 3.3 นโยบายกระทรวงศึกษาธิการ */}
            <div className="pl-4 pt-2 space-y-1">
              <span className="font-bold text-[15pt]">{data.mappings?.moe_policy || '๓.๓ ความสอดคล้องกับนโยบายของกระทรวงศึกษาธิการ'}</span>
              <div className="pl-4 space-y-0.5 text-[14pt]">
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${curMoe.includes('ลดภาระครู') ? 'text-blue-900 font-bold' : ''}`}>{curMoe.includes('ลดภาระครู') ? '☑' : '☐'}</span> <span>ลดภาระครูและบุคลากรทางการศึกษา</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${curMoe.includes('ลดภาระนักเรียน') || curMoe.includes('ลดภาระ') ? 'text-blue-900 font-bold' : ''}`}>{curMoe.includes('ลดภาระนักเรียน') || curMoe.includes('ลดภาระ') ? '☑' : '☐'}</span> <span>ลดภาระนักเรียนและผู้ปกครอง</span>
                </div>
              </div>
            </div>

            {/* 3.4 นโยบาย สอศ. 8 Agenda */}
            <div className="pl-4 pt-2 space-y-1">
              <span className="font-bold text-[15pt]">{data.mappings?.ovec_policy_agenda || '๓.๔ ความสอดคล้องกับนโยบาย สำนักงานคณะกรรมการการอาชีวศึกษา ๘ Agenda'}</span>
              <div className="pl-4 space-y-0.5 text-[14pt]">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curOvec.includes('Anywhere') ? '☑' : '☐'}</span> <span>ส่งเสริมการเรียนรู้อาชีวศึกษาทุกที่ทุกเวลา (Anywhere Anytime)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${curOvec.includes('ปฏิรูป') ? 'text-blue-900 font-bold' : ''}`}>{curOvec.includes('ปฏิรูป') ? '☑' : '☐'}</span> <span className={curOvec.includes('ปฏิรูป') ? 'font-semibold text-blue-950' : ''}>ปฏิรูประบบอาชีวศึกษาและพัฒนาคุณภาพการศึกษา</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{curOvec.includes('ปลอดภัย') ? '☑' : '☐'}</span> <span>เสริมสร้างอาชีวศึกษาแห่งความสุข ปลอดภัย และเป็นมิตรกับสิ่งแวดล้อม</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${curOvec.includes('Skill') || curOvec.includes('ทักษะ') ? 'text-blue-900 font-bold' : ''}`}>{curOvec.includes('Skill') || curOvec.includes('ทักษะ') ? '☑' : '☐'}</span> <span>พัฒนาทักษะและสมรรถนะวิชาชีพกำลังคน (Skill Certificate)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Proposal Page 2: ๓.๔ (ข้อ ๕-๘ ต่อจากหน้า ๑), พันธกิจ (๓.๕), มาตรฐานประกันคุณภาพ (๓.๖), หลักการและเหตุผล (๔), วัตถุประสงค์ (๕)
  const renderProposalPage2 = () => {
    const curOvec = data.ovec_policy_agenda || 'ปฏิรูประบบอาชีวศึกษาและพัฒนาคุณภาพการศึกษา';
    const curMission = data.college_mission || 'พันธกิจที่ ๑ พัฒนาผู้สำเร็จการศึกษาอาชีวศึกษาให้มีความรู้ ทักษะ คุณธรรม จริยธรรม';
    const curQa = data.qa_standard || 'มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์';

    return (
      <div className="space-y-3 text-slate-950 leading-[1.1] select-text text-[16pt] font-['TH_SarabunIT๙','TH_Sarabun_New',sans-serif]">
        {/* 3.4 นโยบาย สอศ. 8 Agenda (ข้อย่อยที่ตัดลงมาต่อหน้า ๒: ข้อ ๕ - ๘) */}
        <div className="pl-8 space-y-0.5 text-[14pt]">
          <div className="flex items-center gap-2">
            <span className="font-mono">{curOvec.includes('ทวิภาคี') || curOvec.includes('เครือข่าย') ? '☑' : '☐'}</span> <span>๕. ส่งเสริมการจัดการศึกษาระบบทวิภาคีและเครือข่ายความร่วมมือ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono">{curOvec.includes('ทรัพยากรบุคคล') || curOvec.includes('บุคลากร') ? '☑' : '☐'}</span> <span>๖. บริหารและพัฒนาทรัพยากรบุคคล</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono">{curOvec.includes('ภาพลักษณ์') ? '☑' : '☐'}</span> <span>๗. เสริมสร้างภาพลักษณ์อาชีวศึกษา</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono">{curOvec.includes('เพิ่มประสิทธิภาพ') || curOvec.includes('บริหารจัดการ') ? '☑' : '☐'}</span> <span>๘. เพิ่มประสิทธิภาพการบริหารจัดการอาชีวศึกษา</span>
          </div>
        </div>

        {/* 3.5 พันธกิจสถานศึกษา */}
        <div>
          <span className="font-bold text-[15pt]">{data.mappings?.college_mission || '๓.๕ ความสอดคล้องกับพันธกิจของสถานศึกษา'}</span>
          <div className="pl-4 space-y-0.5 text-[13.5pt] pt-1">
            <div className="flex items-start gap-2">
              <span className={`font-mono shrink-0 ${curMission.includes('พันธกิจที่ ๑') || curMission.includes('๑') ? 'text-blue-900 font-bold' : ''}`}>{curMission.includes('พันธกิจที่ ๑') || curMission.includes('๑') ? '☑' : '☐'}</span>
              <span>พันธกิจที่ ๑ พัฒนาผู้สำเร็จการศึกษาอาชีวศึกษาให้มีความรู้ ทักษะ คุณธรรม จริยธรรม จรรยาบรรณวิชาชีพ มีจิตสำนึกรักษ์สิ่งแวดล้อม ให้เป็นไปตามมาตรฐานคุณวุฒิอาชีวศึกษา</span>
            </div>
            <div className="flex items-start gap-2">
              <span className={`font-mono shrink-0 ${curMission.includes('พันธกิจที่ ๒') || curMission.includes('๒') ? 'text-blue-900 font-bold' : ''}`}>{curMission.includes('พันธกิจที่ ๒') || curMission.includes('๒') ? '☑' : '☐'}</span>
              <span>พันธกิจที่ ๒ พัฒนาหลักสูตรฐานสมรรถนะที่สอดคล้องกับความต้องการของผู้เรียน ชุมชน สถานประกอบการ ตลาดแรงงาน</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono shrink-0">{curMission.includes('พันธกิจที่ ๓') ? '☑' : '☐'}</span>
              <span>พันธกิจที่ ๓ พัฒนาครูอย่างเป็นระบบต่อเนื่องทั้งด้านคุณธรรม จริยธรรมและความเข้มแข็งทางวิชาการและวิชาชีพ</span>
            </div>
            <div className="flex items-start gap-2">
              <span className={`font-mono shrink-0 ${curMission.includes('พันธกิจที่ ๔') ? 'text-blue-900 font-bold' : ''}`}>{curMission.includes('พันธกิจที่ ๔') ? '☑' : '☐'}</span>
              <span>พันธกิจที่ ๔ พัฒนา ส่งเสริมให้มีการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญตามหลักสูตรและมาตรฐานคุณวุฒิอาชีวศึกษา</span>
            </div>
          </div>
        </div>

        {/* 3.6 มาตรฐานการอาชีวศึกษา */}
        <div className="pt-1">
          <span className="font-bold text-[15pt]">{data.mappings?.qa_standard || '๓.๖ สอดคล้องกับมาตรฐานการอาชีวศึกษา (งานประกันคุณภาพการศึกษา)'}</span>
          <div className="pl-4 space-y-0.5 text-[14pt] pt-1">
            <div className="flex items-center gap-2">
              <span className={`font-mono ${curQa.includes('มาตรฐานที่ ๑') || curQa.includes('1') ? 'text-blue-900 font-bold' : ''}`}>{curQa.includes('มาตรฐานที่ ๑') || curQa.includes('1') ? '☑' : '☐'}</span> <span>มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono ${curQa.includes('มาตรฐานที่ ๒') || curQa.includes('2') ? 'text-blue-900 font-bold' : ''}`}>{curQa.includes('มาตรฐานที่ ๒') || curQa.includes('2') ? '☑' : '☐'}</span> <span>มาตรฐานที่ ๒ การจัดการอาชีวศึกษา</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">{curQa.includes('มาตรฐานที่ ๓') || curQa.includes('3') ? '☑' : '☐'}</span> <span>มาตรฐานที่ ๓ การสร้างสังคมแห่งการเรียนรู้</span>
            </div>
          </div>
        </div>

        {/* 4. หลักการและเหตุผล */}
        <div className="pt-2">
          <div className="font-bold text-[16pt]">{data.mappings?.background || '๔. หลักการและเหตุผล'}</div>
          <p className="thai-distributed indent-12 text-[15pt] leading-[1.15] text-justify pt-1 whitespace-pre-wrap">
            {data.background || 'วิทยาลัยการอาชีพเชียงราย มุ่งเน้นการจัดการศึกษาเพื่อพัฒนาคุณภาพผู้เรียนตามมาตรฐานวิชาชีพ ตอบสนองความต้องการของตลาดแรงงานและยุทธศาสตร์การพัฒนาประเทศอย่างมีประสิทธิภาพ...'}
          </p>
        </div>

        {/* 5. วัตถุประสงค์ */}
        <div className="pt-2">
          <div className="font-bold text-[16pt]">{data.mappings?.objectives || '๕. วัตถุประสงค์'}</div>
          <div className="pl-6 space-y-1 text-[15pt] pt-1">
            {data.objectives && data.objectives.length > 0 ? (
              data.objectives.slice(0, 3).map((obj, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-semibold shrink-0">๕.{['๑', '๒', '๓'][i] || i + 1}</span>
                  <span>{obj}</span>
                </div>
              ))
            ) : (
              <>
                <div>๕.๑ เพื่อพัฒนาทักษะและสมรรถนะวิชาชีพของผู้เรียนให้สอดคล้องกับมาตรฐานสากล</div>
                <div>๕.๒ เพื่อส่งเสริมการเรียนรู้เชิงปฏิบัติการและยกระดับผลสัมฤทธิ์ทางการเรียน</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Proposal Page 3: เป้าหมาย (๖), กิจกรรม PDCA/ระยะเวลา/สถานที่ (๗), งบประมาณ (๘)
  const renderProposalPage3 = () => (
    <div className="space-y-3 text-slate-950 leading-[1.1] select-text text-[16pt] font-['TH_SarabunIT๙','TH_Sarabun_New',sans-serif]">
      {/* 6. เป้าหมาย และตัวชี้วัดความสำเร็จ */}
      <div>
        <div className="font-bold text-[16pt]">๖. เป้าหมาย และตัวชี้วัดความสำเร็จ</div>
        <div className="pl-6 space-y-1 text-[15pt] pt-1">
          <div className="flex items-start gap-1">
            <span className="font-bold shrink-0">๖.๑ เชิงปริมาณ :</span>
            <span>{data.target_quantitative || 'นักเรียน นักศึกษา และบุคลากรเข้าร่วมโครงการร้อยละ ๘๕ ขึ้นไป'}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="font-bold shrink-0">๖.๒ เชิงคุณภาพ :</span>
            <span>{data.target_qualitative || 'ผู้เข้าร่วมโครงการมีความรู้ ทักษะ และความพึงพอใจในระดับดีขึ้นไป (ค่าเฉลี่ยไม่น้อยกว่า ๓.๕๑)'}</span>
          </div>
        </div>
      </div>

      {/* 7. กิจกรรมและหรือขั้นตอนดำเนินการ */}
      <div className="pt-1">
        <div className="font-bold text-[16pt]">๗. กิจกรรมและหรือขั้นตอนดำเนินการ/ระยะเวลาสถานที่</div>
        <div className="pl-4 text-[14pt] space-y-1 pt-1">
          <p className="font-semibold text-slate-900">กิจกรรมและขั้นตอนดำเนินการตามกระบวนการ PDCA</p>
          <div className="pl-4 space-y-0.5 text-[13.5pt]">
            {data.timelines && data.timelines.length > 0 ? (
              data.timelines.map((t, idx) => (
                <p key={idx}>
                  • <b>{t.activity_name}</b>{t.description ? ` : ${t.description}` : ''}
                </p>
              ))
            ) : (
              <>
                <p>• <b>เสนอโครงการ (PLAN)</b> : จัดทำโครงการ ประสานงาน และขออนุมัติโครงการ</p>
                <p>• <b>ดำเนินการตามโครงการ (DO)</b> : แต่งตั้งคณะกรรมการ จัดซื้อจัดจ้าง และดำเนินกิจกรรมตามแผนงาน</p>
                <p>• <b>การประเมินผลการดำเนินงานโครงการ/การติดตามผล/สรุปผล (CHECK)</b> : สำรวจและรวบรวมข้อมูล วิเคราะห์ผลการดำเนินงานตามตัวชี้วัด</p>
                <p>• <b>รายงานผล (Act)</b> : สรุปรายงานผลการดำเนินงาน ข้อเสนอแนะปรับปรุง และนำไปพัฒนาในปีต่อไป</p>
              </>
            )}
          </div>
          <div className="pt-1.5 pl-2 text-[14pt]">
            <p><b>ระยะเวลา:</b> {startDateThai && endDateThai ? `${startDateThai} – ${endDateThai}` : `วันที่ ๑ ตุลาคม ๒๕๖๘ – ๓๐ กันยายน ๒๕๖๙`}</p>
            <p><b>สถานที่:</b> {locationFull}</p>
          </div>
        </div>
      </div>

      {/* 8. งบประมาณ */}
      <div className="pt-1">
        <div className="font-bold text-[16pt]">๘. งบประมาณ/ทรัพยากรและแหล่งที่มา การดำเนินโครงการ (ตัวคูณ)</div>
        <div className="pt-1">
          <table className="w-full text-[13pt] border-collapse border border-black text-center">
            <thead>
              <tr className="bg-slate-100/70 font-bold">
                <th className="border border-black p-1.5 w-[38%] text-center">หมวดรายจ่าย/ประเภทรายจ่าย</th>
                <th className="border border-black p-1.5 w-[16%]">งบประมาณ</th>
                <th className="border border-black p-1.5 w-[16%]">เงินรายได้สถานศึกษา</th>
                <th className="border border-black p-1.5 w-[20%]">งบเงินอุดหนุน<br/><span className="text-[11pt] font-normal">(ค่ากิจกรรมพัฒนาคุณภาพผู้เรียน)</span></th>
                <th className="border border-black p-1.5 w-[10%]">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const isMat = (b: any) => (b.category_name && b.category_name.includes('วัสดุ')) || Number(b.category_id) === 3 || (!b.category_name && !b.category_id && !(b.description || '').includes('ใช้สอย') && !(b.description || '').includes('ตอบแทน'));
                const isSvc = (b: any) => (b.category_name && b.category_name.includes('ใช้สอย')) || Number(b.category_id) === 2 || (!b.category_name && (b.description && (b.description.includes('ใช้สอย') || b.description.includes('อาหาร') || b.description.includes('ที่พัก') || b.description.includes('สถานที่') || b.description.includes('จ้าง'))));
                const isRem = (b: any) => (b.category_name && b.category_name.includes('ตอบแทน')) || Number(b.category_id) === 1 || (!b.category_name && (b.description && (b.description.includes('ตอบแทน') || b.description.includes('วิทยากร') || b.description.includes('กรรมการ'))));

                const matBudget = (data.budget_items || [])
                  .filter(isMat)
                  .reduce((acc, b) => acc + (Number(b.quantity) || 0) * (Number(b.unit_price) || 0), 0);
                const svcBudget = (data.budget_items || [])
                  .filter(isSvc)
                  .reduce((acc, b) => acc + (Number(b.quantity) || 0) * (Number(b.unit_price) || 0), 0);
                const remBudget = (data.budget_items || [])
                  .filter(isRem)
                  .reduce((acc, b) => acc + (Number(b.quantity) || 0) * (Number(b.unit_price) || 0), 0);

                const hasItems = (data.budget_items || []).length > 0;
                const matDisplay = hasItems ? (matBudget > 0 ? matBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-') : totalBudgetText;
                const svcDisplay = hasItems && svcBudget > 0 ? svcBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';
                const remDisplay = hasItems && remBudget > 0 ? remBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';

                return (
                  <>
                    <tr>
                      <td className="border border-black p-1.5 text-left pl-3 font-semibold">ค่าวัสดุ</td>
                      <td className="border border-black p-1.5 text-right pr-2">{matDisplay}</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">-</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-left pl-3 font-semibold">ค่าใช้สอย</td>
                      <td className="border border-black p-1.5 text-right pr-2">{svcDisplay}</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">-</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-left pl-3 font-semibold">ค่าตอบแทน</td>
                      <td className="border border-black p-1.5 text-right pr-2">{remDisplay}</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">-</td>
                    </tr>
                    <tr className="font-bold bg-slate-50/80">
                      <td className="border border-black p-1.5 text-center">รวมทั้งสิ้น</td>
                      <td className="border border-black p-1.5 text-right pr-2">{totalBudgetText}</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">-</td>
                      <td className="border border-black p-1.5">บาท</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
          {bahtText && <p className="text-right text-[13pt] pt-1 italic font-semibold">({bahtText})</p>}
        </div>
      </div>

      {/* 9. ผลที่คาดว่าจะได้รับ (ต่อท้ายข้อ 8 ในหน้า 3) */}
      <div className="pt-1">
        <div className="font-bold text-[16pt]">{data.mappings?.expected_results || '๙. ผลที่คาดว่าจะได้รับ'}</div>
        {(() => {
          const raw = data.expected_results || '๑. นักเรียน นักศึกษาได้รับการพัฒนาทักษะวิชาชีพและประสบการณ์ตรงตามมาตรฐานการศึกษา\n๒. สถานศึกษาได้รับการยอมรับในคุณภาพการจัดการเรียนการสอนและมีความร่วมมือที่ดีกับชุมชน';
          const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
          return lines.map((line, idx) => (
            <p key={idx} className="thai-distributed indent-12 text-[15pt] pt-0.5 whitespace-pre-wrap">
              {line}
            </p>
          ));
        })()}
      </div>

      {/* 10. การติดตามและประเมินผล (ดึงขึ้นมาเติมหน้า 3 ให้เต็ม) */}
      <div className="pt-1">
        <div className="font-bold text-[16pt]">{data.mappings?.monitoring_evaluation || '๑๐. การติดตาม และประเมินผลโครงการ'}</div>
        {(() => {
          const raw = data.monitoring_evaluation || 'ใช้แบบสอบถามประเมินความพึงพอใจของผู้เข้าร่วมโครงการ และการติดตามประเมินผลการดำเนินงานตามตัวชี้วัดความสำเร็จของโครงการ';
          const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
          return lines.map((line, idx) => (
            <p key={idx} className="thai-distributed indent-12 text-[15pt] pt-0.5 whitespace-pre-wrap">
              {line}
            </p>
          ));
        })()}
      </div>

      {/* Signatures ผู้เสนอโครงการ & ผู้เห็นชอบโครงการ */}
      <div className="grid grid-cols-2 gap-4 pt-4 text-[14pt]">
          <div className="text-center space-y-1">
            <p>ลงชื่อ.........................................................</p>
            <p>( {leaderName} )</p>
            <p>ตำแหน่ง {leaderPos}</p>
            <p className="font-bold text-slate-800">ผู้เสนอโครงการ</p>
          </div>

          <div className="text-center space-y-1">
            <p>ลงชื่อ.........................................................</p>
            <p className="font-semibold">{data.endorser_name ? `(${data.endorser_name})` : '( ................................................... )'}</p>
            <p>ตำแหน่ง {data.endorser_position || data.mappings?.endorser_position || 'หัวหน้าแผนกวิชา / งาน'}</p>
            <p className="font-bold text-slate-800">ผู้เห็นชอบโครงการ</p>
          </div>
        </div>
      </div>
  );

  // Proposal Page 4: การพิจารณาของงานแผนงาน และการอนุมัติของผู้อำนวยการวิทยาลัยฯ
  const renderProposalPage4 = () => (
    <div className="space-y-6 text-slate-950 leading-[1.15] select-text text-[16pt] font-['TH_SarabunIT๙','TH_Sarabun_New',sans-serif]">
      {/* ส่วนตรวจสอบและเสนอความเห็นของงานวางแผนและงบประมาณ */}
      <div className="p-4 border border-slate-900 rounded-xl space-y-3 text-[14pt]">
        <div className="font-bold text-[16pt] text-slate-900">เรียน ผู้อำนวยการ{data.college_name || 'วิทยาลัยการอาชีพเชียงราย'}</div>
        <div className="grid grid-cols-2 gap-4 pl-2 text-[14pt]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-6">
              <span><span className="font-mono text-base">☑</span> ตามแผน</span>
              <span><span className="font-mono text-base">☐</span> ไม่ตามแผน</span>
            </div>
            <div className="flex items-center gap-4">
              <span><span className="font-mono text-base">☑</span> งปม.</span>
              <span><span className="font-mono text-base">☐</span> ปวช.</span>
              <span><span className="font-mono text-base">☐</span> ปวส.</span>
            </div>
            <div><span className="font-mono text-base">☐</span> ระยะสั้น <span className="font-mono text-base ml-3">☐</span> ทวิศึกษา</div>
            <div><span className="font-mono text-base">☐</span> อุดหนุน (ค่ากิจกรรมพัฒนาคุณภาพผู้เรียน)</div>
          </div>

          <div className="space-y-1.5 border-l border-slate-300 pl-4">
            <div><span className="font-mono text-base">☐</span> เงินรายได้สถานศึกษา</div>
            <div className="pt-3 font-bold text-slate-900 text-[15pt]">- เพื่อโปรดพิจารณาอนุมัติ</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 text-center text-[13pt]">
          <div className="space-y-1">
            <p>ลงชื่อ.........................................................</p>
            <p className="font-semibold">({data.planning_head_name || 'นายเจษฎา คำเรือง'})</p>
            <p>{data.planning_head_position || 'หัวหน้างานวางแผนและงบประมาณ'}</p>
          </div>
          <div className="space-y-1">
            <p>ลงชื่อ.........................................................</p>
            <p className="font-semibold">({data.deputy_strat_name || 'นายพุทธิพัชร์ ธนพัทธ์ปัญญา'})</p>
            <p>{data.deputy_strat_position || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ'}</p>
          </div>
        </div>
      </div>

      {/* ส่วนความเห็นและคำสั่งอนุมัติของผู้อำนวยการสถานศึกษา */}
      <div className="p-6 border border-slate-400 rounded-xl bg-slate-50/50 space-y-4">
        <div className="font-bold text-[17pt] text-slate-900 border-b pb-2">
          ความเห็นผู้อำนวยการ{data.college_name || 'วิทยาลัยการอาชีพเชียงราย'}
        </div>

        <div className="space-y-3 text-[16pt] pl-4 pt-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl text-emerald-600 font-bold">☑</span>
            <span className="font-bold text-emerald-950">อนุมัติให้ดำเนินโครงการตามที่เสนอ</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span className="font-mono text-2xl">☐</span>
            <span>ไม่อนุมัติ ..........................................................................</span>
          </div>
        </div>

        <div className="pt-8 text-center space-y-1">
          <p className="text-[16pt]">ลงชื่อ......................................................................</p>
          <p className="font-bold text-[17pt] text-slate-900">({data.director_name || 'นางปิยะพร พูลเพิ่ม'})</p>
          <p className="text-[16pt] text-slate-700">{data.director_position || `ผู้อำนวยการ${data.college_name || 'วิทยาลัยการอาชีพเชียงราย'}`}</p>
          <p className="font-bold text-blue-900 pt-1 text-[16pt]">ผู้อนุมัติโครงการ</p>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUMMARY TEMPLATE (8 PAGES) - รายงานสรุปผลการดำเนินงานโครงการ
  // =========================================================================
  const renderSummaryPage1 = () => (
    <div className="space-y-1 text-slate-950 leading-[1.0] select-text">
      <div className="relative flex items-center mb-1">
        <div className="w-16 h-16 shrink-0 flex items-center justify-start">
          <img src="/template-media/image1.jpeg" alt="ตราครุฑ" className="w-14 h-14 object-contain" />
        </div>
        <div className="flex-1 text-center -ml-16">
          <h1 className="text-[20pt] font-bold tracking-normal leading-[1.0] inline-block">
            บันทึกข้อความ
          </h1>
        </div>
      </div>

      <div className="space-y-1 leading-[1.0] text-[16pt]">
        <div className="flex items-baseline leading-[1.0]">
          <span className="font-bold text-[20pt] mr-2 shrink-0 leading-[1.0]">ส่วนราชการ</span>
          <span className="flex-1 font-normal text-[16pt] pb-0.5 leading-[1.0]">
            {deptName ? `${deptName} วิทยาลัยการอาชีพเชียงราย` : (divName ? `${divName} วิทยาลัยการอาชีพเชียงราย` : 'วิทยาลัยการอาชีพเชียงราย')}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-2 items-baseline leading-[1.0]">
          <div className="col-span-6 flex items-baseline leading-[1.0]">
            <span className="font-bold text-[20pt] mr-2 shrink-0 leading-[1.0]">ที่</span>
            <span className="flex-1 font-normal text-[16pt] pb-0.5 leading-[1.0]">
              {data.project_code || ''}
            </span>
          </div>
          <div className="col-span-6 flex items-baseline leading-[1.0]">
            <span className="font-bold text-[20pt] mr-2 shrink-0 leading-[1.0]">วันที่</span>
            <span className="flex-1 font-normal text-[16pt] pb-0.5 leading-[1.0]">
              {todayThaiFull}
            </span>
          </div>
        </div>

        <div className="flex items-baseline leading-[1.0]">
          <span className="font-bold text-[20pt] mr-2 shrink-0 leading-[1.0]">เรื่อง</span>
          <span className="flex-1 font-normal text-[16pt] pb-0.5 leading-[1.0]">
            รายงานผลการดำเนินงานโครงการ {projectTitle}
          </span>
        </div>

        <div className="flex items-baseline pt-0.5 leading-[1.0]">
          <span className="font-bold text-[20pt] mr-2 shrink-0 leading-[1.0]">เรียน</span>
          <span className="font-normal text-[16pt] leading-[1.0]">ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย</span>
        </div>
      </div>

      <div className="h-2"></div>

      <p className="thai-distributed indent-16 text-[16pt] leading-[1.0] my-2.5">
        ตามที่ {divName} {deptName} ได้ดำเนินงานโครงการ {projectTitle} ประจำปีงบประมาณ {fiscalYear} บัดนี้การดำเนินงานได้เสร็จสิ้นเป็นที่เรียบร้อยแล้ว จึงขอรายงานผลการดำเนินงานโครงการตามเอกสารแนบ
      </p>

      <div className="pt-8 flex justify-end">
        <div className="text-center w-80 space-y-1 text-[16pt] leading-[1.0]">
          <p className="mb-6 leading-[1.0]">(ลงชื่อ)........................................................</p>
          <p className="font-normal leading-[1.0]">( {leaderName} )</p>
          <p className="text-slate-800 leading-[1.0]">ตำแหน่ง {leaderPos}</p>
        </div>
      </div>
    </div>
  );

  const renderSummaryPage2 = () => (
    <div className="flex flex-col justify-between h-[250mm] text-center select-text py-4">
      <div className="space-y-4 pt-4">
        <img
          src="/template-media/image2.jpg"
          alt="ตราสัญลักษณ์วิทยาลัย"
          className="w-24 h-24 mx-auto object-contain"
        />
        <div className="space-y-2">
          <h1 className="text-[26pt] font-bold text-slate-900 leading-[1.2]">
            รายงานผลการดำเนินงาน
          </h1>
          <h2 className="text-[22pt] font-bold text-slate-900 leading-[1.2]">
            {projectTitle}
          </h2>
          <p className="text-[18pt] font-bold text-slate-800">
            ประจำปีงบประมาณ {fiscalYear}
          </p>
        </div>
      </div>

      <div className="my-auto py-2">
        <div className="w-64 h-40 mx-auto bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400">
          <BookOpen className="w-8 h-8 mb-1 text-slate-300" />
          <span className="text-xs">ภาพกิจกรรมโครงการ</span>
        </div>
      </div>

      <div className="space-y-1.5 pb-8 text-[18pt]">
        <p className="font-bold">ผู้รับผิดชอบโครงการ</p>
        <p className="font-normal">{leaderName}</p>
        <p className="text-slate-700">ตำแหน่ง {leaderPos}</p>
        <p className="font-bold pt-2">{deptName ? `${deptName}` : ''} {divName ? `• ${divName}` : ''}</p>
        <p className="font-bold text-blue-950">วิทยาลัยการอาชีพเชียงราย</p>
      </div>
    </div>
  );

  // Router for pages
  const renderPageByIndex = (index: number) => {
    if (templateType === 'proposal') {
      switch (index) {
        case 0: return renderProposalPage1();
        case 1: return renderProposalPage2();
        case 2: return renderProposalPage3();
        case 3: return renderProposalPage4();
        default: return renderProposalPage1();
      }
    } else {
      switch (index) {
        case 0: return renderSummaryPage1();
        case 1: return renderSummaryPage2();
        default: return renderProposalPage3();
      }
    }
  };

  return (
    <div className="flex flex-col items-center select-text w-full max-w-full">
      {/* Single Unified Top Toolbar */}
      <div className="w-full max-w-[210mm] flex flex-wrap items-center justify-between gap-2 mb-3 bg-white px-3.5 py-2 rounded-xl shadow-xs border border-slate-300 text-xs no-print">
        {/* Left: Template Info & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 truncate">
            <FileText className="w-3.5 h-3.5 text-blue-900 shrink-0" />
            <span className="truncate">{data.template_name || 'Form โครงการ'}</span>
          </span>
          {viewEngine === 'docx' ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300 shrink-0 flex items-center gap-1">
              {loadingDocx ? <Loader2 className="w-3 h-3 animate-spin text-emerald-700" /> : <CheckSquare className="w-3 h-3 text-emerald-700" />}
              <span>{loadingDocx ? 'กำลังโหลด Word...' : 'เรนเดอร์จากไฟล์ Word (.docx) สด'}</span>
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold border border-blue-200 shrink-0">
              {templateType === 'proposal' ? 'แบบเสนอโครงการ (๔ หน้า)' : 'รายงานสรุปผล (๘ หน้า)'}
            </span>
          )}
        </div>

        {/* Right: Engine Switch + Zoom Controls + Print Button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Engine Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewEngine('docx')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                viewEngine === 'docx' ? 'bg-white shadow-xs text-blue-900' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="อ่านและแสดงผลโดยตรงจากไฟล์ .docx ต้นแบบ 100%"
            >
              <FileText className="w-3 h-3 text-blue-900" />
              <span>ไฟล์ Word จริง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewEngine('interactive')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                viewEngine === 'interactive' ? 'bg-white shadow-xs text-blue-900' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="จำลองหน้าเอกสาร A4 แบบโต้ตอบได้ทันที"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>โหมดจำลอง</span>
            </button>
          </div>

          {viewEngine === 'interactive' && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setDisplayMode('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                  displayMode === 'all' ? 'bg-white shadow-xs text-blue-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>ทุกหน้า</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('single')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                  displayMode === 'single' ? 'bg-white shadow-xs text-blue-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>ทีละหน้า</span>
              </button>
            </div>
          )}

          {viewEngine === 'interactive' && displayMode === 'single' && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                disabled={activePageIndex === 0}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-slate-800 text-[11px] min-w-[50px] text-center">
                {activePageIndex + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setActivePageIndex((p) => Math.min(totalPages - 1, p + 1))}
                disabled={activePageIndex >= totalPages - 1}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zoom Presets */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => handleZoom(0.75)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentZoom === 0.75 ? 'bg-white shadow-2xs text-blue-900' : 'text-slate-600 hover:text-slate-900'}`}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.85)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentZoom === 0.85 ? 'bg-white shadow-2xs text-blue-900' : 'text-slate-600 hover:text-slate-900'}`}
            >
              85%
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1.0)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentZoom === 1.0 ? 'bg-white shadow-2xs text-blue-900' : 'text-slate-600 hover:text-slate-900'}`}
            >
              100%
            </button>
          </div>

          {/* Zoom In / Out Stepper */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleZoom(Math.max(0.4, Number((currentZoom - 0.05).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
              title="ย่อ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center font-mono font-bold text-slate-800 text-[10px]">
              {Math.round(currentZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(Math.min(1.3, Number((currentZoom + 0.05).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
              title="ขยาย"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {showPrint && (
            <>
              <div className="h-4 w-px bg-slate-300 mx-0.5"></div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold shadow-xs transition text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์เอกสาร A4</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pages Container */}
      <div
        className="transition-transform origin-top flex flex-col items-center gap-8 pb-16 w-full"
        style={{ transform: `scale(${currentZoom})` }}
      >
        {/* ENGINE 1: Real Word .docx Template Rendered Directly via docx-preview */}
        <div className={viewEngine === 'docx' ? 'w-full flex flex-col items-center relative' : 'hidden'}>
          {loadingDocx && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs z-10 flex flex-col items-center justify-center min-h-[500px] rounded-xl">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-2" />
              <p className="text-sm font-bold text-slate-800">กำลังอ่านข้อมูลและจัดหน้าเอกสารจากไฟล์ Word ต้นแบบ...</p>
              <p className="text-xs text-slate-500">ตรงตามไฟล์แม่แบบที่อัปโหลด 100%</p>
            </div>
          )}

          {docxError && (
            <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 max-w-lg text-center">
              <p className="font-bold mb-1">เกิดข้อผิดพลาดในการโหลดไฟล์ Word ต้นแบบ</p>
              <p className="mb-2 text-slate-600">{docxError}</p>
              <button
                type="button"
                onClick={() => setViewEngine('interactive')}
                className="px-3 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700"
              >
                สลับไปใช้โหมดจำลอง
              </button>
            </div>
          )}

          <div
            ref={docxContainerRef}
            className="docx-render-host w-full flex flex-col items-center"
          />
        </div>

        {/* ENGINE 2: Interactive HTML Preview */}
        {viewEngine === 'interactive' && (
          displayMode === 'all' ? (
            Array.from({ length: totalPages }).map((_, idx) => (
              <div
                key={`${templateType}-${idx}`}
                suppressHydrationWarning
                className="a4-page shadow-2xl border border-slate-300 relative bg-white text-black box-border text-[16pt] leading-[1.1] select-text font-['TH_SarabunIT๙','TH_Sarabun_New','TH_SarabunPSK',sans-serif]"
                style={{ fontFamily: "'TH SarabunIT๙', 'TH Sarabun New', 'TH SarabunPSK', Sarabun, sans-serif" }}
              >
                <div className="absolute top-4 right-6 text-[11pt] text-slate-400 font-mono no-print">
                  หน้า {idx + 1} / {totalPages}
                </div>

                {renderPageByIndex(idx)}
              </div>
            ))
          ) : (
            <div
              key={`${templateType}-${activePageIndex}`}
              className="a4-page shadow-2xl border border-slate-300 relative bg-white text-black box-border text-[16pt] leading-[1.1] select-text font-['TH_SarabunIT๙','TH_Sarabun_New','TH_SarabunPSK',sans-serif]"
              style={{ fontFamily: "'TH SarabunIT๙', 'TH Sarabun New', 'TH SarabunPSK', Sarabun, sans-serif" }}
            >
              <div className="absolute top-4 right-6 text-[11pt] text-slate-400 font-mono no-print">
                หน้า {activePageIndex + 1} / {totalPages}
              </div>

              {renderPageByIndex(activePageIndex)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
