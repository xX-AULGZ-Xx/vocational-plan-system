'use client';

import React, { useRef } from 'react';
import { Award, Download, Printer, CheckCircle2 } from 'lucide-react';

export interface CertificateConfig {
  template_theme?: 'classic_blue' | 'royal_gold' | 'emerald_modern' | 'maroon_velvet' | 'custom';
  background_image?: string | null;
  title?: string;
  subtitle?: string;
  course_name?: string;
  signatory_1_name?: string;
  signatory_1_position?: string;
  signatory_1_image?: string | null;
  signatory_2_name?: string;
  signatory_2_position?: string;
  signatory_2_image?: string | null;
  college_logo?: string | null;
  issue_date_text?: string;
  certificate_no_prefix?: string;
  font_family?: string;
}

export interface CertificateAttendeeData {
  full_name: string;
  title_name?: string;
  position?: string;
  organization?: string;
  certificate_no?: string;
  issue_date?: string;
  project_title?: string;
}

interface CertificateRendererProps {
  attendee: CertificateAttendeeData;
  config?: CertificateConfig;
  className?: string;
  showActions?: boolean;
  scale?: number;
}

export const THEME_STYLES: Record<string, {
  name: string;
  bgGradient: string;
  outerBorder: string;
  innerBorder: string;
  titleColor: string;
  accentColor: string;
  nameColor: string;
  textColor: string;
  cornerAccent: string;
}> = {
  classic_blue: {
    name: 'น้ำเงินคลาสสิก (Classic Navy)',
    bgGradient: 'from-slate-50 via-blue-50/30 to-indigo-50/40',
    outerBorder: 'border-blue-900',
    innerBorder: 'border-amber-600',
    titleColor: 'text-blue-950',
    accentColor: 'text-blue-800',
    nameColor: 'text-blue-950',
    textColor: 'text-slate-700',
    cornerAccent: '#1e3a8a',
  },
  royal_gold: {
    name: 'ทองหรูหรา (Royal Gold)',
    bgGradient: 'from-amber-50/40 via-yellow-50/20 to-orange-50/30',
    outerBorder: 'border-amber-700',
    innerBorder: 'border-amber-500',
    titleColor: 'text-amber-950',
    accentColor: 'text-amber-800',
    nameColor: 'text-amber-950',
    textColor: 'text-stone-800',
    cornerAccent: '#b45309',
  },
  emerald_modern: {
    name: 'เขียวมรกต (Emerald Modern)',
    bgGradient: 'from-emerald-50/30 via-teal-50/20 to-slate-50',
    outerBorder: 'border-emerald-800',
    innerBorder: 'border-emerald-600',
    titleColor: 'text-emerald-950',
    accentColor: 'text-emerald-800',
    nameColor: 'text-emerald-950',
    textColor: 'text-slate-800',
    cornerAccent: '#065f46',
  },
  maroon_velvet: {
    name: 'แดงเลือดหมูทางการ (Royal Maroon)',
    bgGradient: 'from-rose-50/30 via-red-50/20 to-slate-50',
    outerBorder: 'border-rose-900',
    innerBorder: 'border-amber-600',
    titleColor: 'text-rose-950',
    accentColor: 'text-rose-900',
    nameColor: 'text-rose-950',
    textColor: 'text-stone-800',
    cornerAccent: '#881337',
  },
  custom: {
    name: 'ภาพพื้นหลังที่อัปโหลดเอง (Custom Upload)',
    bgGradient: 'bg-transparent',
    outerBorder: 'border-transparent',
    innerBorder: 'border-transparent',
    titleColor: 'text-slate-900',
    accentColor: 'text-slate-800',
    nameColor: 'text-slate-950',
    textColor: 'text-slate-800',
    cornerAccent: 'transparent',
  },
};

export default function CertificateRenderer({
  attendee,
  config = {},
  className = '',
  showActions = true,
}: CertificateRendererProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const themeKey = config.template_theme || (config.background_image ? 'custom' : 'classic_blue');
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.classic_blue;
  const isCustomBg = Boolean(config.background_image);

  const displayName = `${attendee.title_name || ''} ${attendee.full_name || ''}`.trim() || 'ชื่อ-นามสกุล ผู้เข้าร่วมโครงการ';
  const displayTitle = config.title || 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า';
  const displaySubtitle = config.subtitle || 'ได้เข้าร่วมและผ่านการอบรมโครงการ';
  const displayCourse = config.course_name || attendee.project_title || 'โครงการสัมมนาเชิงปฏิบัติการ';
  const displayCertNo = attendee.certificate_no || 'CERT-2569-0001';

  // Format date in Thai
  const issueDateFormatted = (() => {
    if (config.issue_date_text) return config.issue_date_text;
    const d = attendee.issue_date ? new Date(attendee.issue_date) : new Date();
    const thMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];
    return `ให้ไว้ ณ วันที่ ${d.getDate()} เดือน ${thMonths[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
  })();

  const handlePrint = () => {
    const printContent = certRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>เกียรติบัตร - ${displayName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: white;
              font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .cert-page {
              width: 297mm;
              height: 209.5mm;
              position: relative;
              overflow: hidden;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="cert-page">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Printable / Visual A4 Landscape Certificate Canvas */}
      <div className="w-full max-w-[1000px] overflow-hidden rounded-xl shadow-2xl border border-slate-300 bg-white">
        <div
          ref={certRef}
          className="relative w-full aspect-[297/210] flex flex-col justify-between p-8 sm:p-12 md:p-14 select-none overflow-hidden"
          style={{
            backgroundImage: isCustomBg ? `url(${config.background_image})` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Background Gradient & Frame if not custom image */}
          {!isCustomBg && (
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} pointer-events-none`}>
              {/* Outer Decorative Border */}
              <div className={`absolute inset-3 sm:inset-5 border-[3px] ${theme.outerBorder} pointer-events-none`} />
              {/* Inner Fine Border */}
              <div className={`absolute inset-4 sm:inset-7 border-[1px] ${theme.innerBorder} pointer-events-none opacity-80`} />

              {/* Ornate Corner Elements */}
              <svg className="absolute top-4 left-4 sm:top-6 sm:left-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                <path d="M5,5 L15,5 C10,5 5,10 5,15 Z" fill="#d97706" opacity="0.6" />
                <rect x="0" y="0" width="4" height="25" />
                <rect x="0" y="0" width="25" height="4" />
              </svg>
              <svg className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none rotate-90" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                <path d="M5,5 L15,5 C10,5 5,10 5,15 Z" fill="#d97706" opacity="0.6" />
                <rect x="0" y="0" width="4" height="25" />
                <rect x="0" y="0" width="25" height="4" />
              </svg>
              <svg className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none -rotate-90" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                <path d="M5,5 L15,5 C10,5 5,10 5,15 Z" fill="#d97706" opacity="0.6" />
                <rect x="0" y="0" width="4" height="25" />
                <rect x="0" y="0" width="25" height="4" />
              </svg>
              <svg className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none rotate-180" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                <path d="M5,5 L15,5 C10,5 5,10 5,15 Z" fill="#d97706" opacity="0.6" />
                <rect x="0" y="0" width="4" height="25" />
                <rect x="0" y="0" width="25" height="4" />
              </svg>
            </div>
          )}

          {/* Certificate Header: Code & Logo */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 tracking-wider">
              เลขที่: {displayCertNo}
            </div>

            {/* Emblem/Logo */}
            {!isCustomBg && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-white shadow-md border-2 border-amber-500 overflow-hidden">
                  <Award className="w-8 h-8 sm:w-11 sm:h-11 md:w-13 md:h-13 text-amber-600" />
                </div>
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-700 mt-1 tracking-wide">
                  วิทยาลัยอาชีวศึกษาเชียงราย
                </span>
              </div>
            )}

            <div className="w-16 sm:w-20"></div>
          </div>

          {/* Certificate Body */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto py-2 sm:py-4">
            <p className={`text-xs sm:text-sm md:text-base font-semibold ${theme.titleColor} tracking-wide`}>
              {displayTitle}
            </p>

            {/* Recipient Full Name */}
            <div className="my-2 sm:my-3">
              <h1 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold ${theme.nameColor} tracking-tight font-serif`}>
                {displayName}
              </h1>
              {attendee.organization && (
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5">
                  {attendee.organization} {attendee.position ? `(${attendee.position})` : ''}
                </p>
              )}
              <div className="w-48 sm:w-72 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-1" />
            </div>

            <p className={`text-xs sm:text-sm md:text-base font-normal ${theme.textColor} max-w-xl`}>
              {displaySubtitle}
            </p>

            <h2 className={`text-sm sm:text-base md:text-lg font-bold ${theme.accentColor} mt-1 max-w-2xl px-4`}>
              &ldquo;{displayCourse}&rdquo;
            </h2>

            <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 font-medium mt-2 sm:mt-3">
              {issueDateFormatted}
            </p>
          </div>

          {/* Certificate Footer: Signatories */}
          <div className="relative z-10 grid grid-cols-2 gap-6 sm:gap-12 pt-2 text-center">
            {/* Signatory 1 */}
            <div className="flex flex-col items-center justify-end">
              {config.signatory_1_image ? (
                <img
                  src={config.signatory_1_image}
                  alt="ลายเซ็น 1"
                  className="h-8 sm:h-12 md:h-14 object-contain mb-0.5"
                />
              ) : (
                <div className="h-6 sm:h-9 border-b border-slate-400 w-32 sm:w-44 mb-1" />
              )}
              <p className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-900">
                ({config.signatory_1_name || 'ชื่อ-สกุล ผู้ลงนามที่ ๑'})
              </p>
              <p className="text-[9px] sm:text-[11px] text-slate-600 font-medium">
                {config.signatory_1_position || 'ผู้อำนวยการวิทยาลัยอาชีวศึกษาเชียงราย'}
              </p>
            </div>

            {/* Signatory 2 */}
            <div className="flex flex-col items-center justify-end">
              {config.signatory_2_image ? (
                <img
                  src={config.signatory_2_image}
                  alt="ลายเซ็น 2"
                  className="h-8 sm:h-12 md:h-14 object-contain mb-0.5"
                />
              ) : (
                <div className="h-6 sm:h-9 border-b border-slate-400 w-32 sm:w-44 mb-1" />
              )}
              <p className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-900">
                ({config.signatory_2_name || 'ชื่อ-สกุล ผู้รับผิดชอบโครงการ'})
              </p>
              <p className="text-[9px] sm:text-[11px] text-slate-600 font-medium">
                {config.signatory_2_position || 'หัวหน้างาน / ผู้รับผิดชอบโครงการ'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ / บันทึกเป็น PDF (A4 แนวนอน)</span>
          </button>
        </div>
      )}
    </div>
  );
}
