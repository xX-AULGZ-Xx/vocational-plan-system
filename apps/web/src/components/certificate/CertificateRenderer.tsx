'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Printer, Move, Check, Type, Sparkles } from 'lucide-react';

export interface BlockStyle {
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  fontSize?: number; // Font size in px (base 1000px width)
  color?: string; // Hex color code
  fontWeight?: 'normal' | 'semibold' | 'bold' | 'bolder' | '800';
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: 'sarabun' | 'charm' | 'prompt' | 'kanit' | 'mitr';
  enabled?: boolean;
  showOrg?: boolean;
}

export interface CertificateConfig {
  template_theme?: 'classic_blue' | 'royal_gold' | 'emerald_modern' | 'maroon_velvet' | 'custom' | 'blank';
  background_image?: string | null;
  course_name?: string;
  certificate_no_prefix?: string;
  name_block?: BlockStyle;
  course_block?: BlockStyle;
  cert_no_block?: BlockStyle;
  // Legacy optional fields kept for backwards compatibility
  title?: string;
  subtitle?: string;
  signatory_1_name?: string;
  signatory_1_position?: string;
  signatory_1_image?: string | null;
  signatory_2_name?: string;
  signatory_2_position?: string;
  signatory_2_image?: string | null;
  issue_date_text?: string;
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
  isEditable?: boolean;
  selectedBlock?: 'name' | 'course' | 'cert_no' | null;
  onSelectBlock?: (blockKey: 'name' | 'course' | 'cert_no') => void;
  onBlockChange?: (blockKey: 'name' | 'course' | 'cert_no', updated: BlockStyle) => void;
}

export const THEME_STYLES: Record<string, {
  name: string;
  bgGradient: string;
  outerBorder: string;
  innerBorder: string;
  cornerAccent: string;
}> = {
  classic_blue: {
    name: 'น้ำเงินคลาสสิก (Classic Navy)',
    bgGradient: 'from-slate-50 via-blue-50/30 to-indigo-50/40',
    outerBorder: 'border-blue-900',
    innerBorder: 'border-amber-600',
    cornerAccent: '#1e3a8a',
  },
  royal_gold: {
    name: 'ทองหรูหรา (Royal Gold)',
    bgGradient: 'from-amber-50/40 via-yellow-50/20 to-orange-50/30',
    outerBorder: 'border-amber-700',
    innerBorder: 'border-amber-500',
    cornerAccent: '#b45309',
  },
  emerald_modern: {
    name: 'เขียวมรกต (Emerald Modern)',
    bgGradient: 'from-emerald-50/30 via-teal-50/20 to-slate-50',
    outerBorder: 'border-emerald-800',
    innerBorder: 'border-emerald-600',
    cornerAccent: '#065f46',
  },
  maroon_velvet: {
    name: 'แดงเลือดหมูทางการ (Royal Maroon)',
    bgGradient: 'from-rose-50/30 via-red-50/20 to-slate-50',
    outerBorder: 'border-rose-900',
    innerBorder: 'border-amber-600',
    cornerAccent: '#881337',
  },
  blank: {
    name: 'พื้นหลังสีขาวเรียบ (Clean White)',
    bgGradient: 'bg-white',
    outerBorder: 'border-transparent',
    innerBorder: 'border-transparent',
    cornerAccent: 'transparent',
  },
  custom: {
    name: 'ภาพพื้นหลังที่อัปโหลดเอง (Custom Upload)',
    bgGradient: 'bg-transparent',
    outerBorder: 'border-transparent',
    innerBorder: 'border-transparent',
    cornerAccent: 'transparent',
  },
};

export const FONT_FAMILIES: Record<string, { name: string; css: string }> = {
  sarabun: { name: 'สารบรรณ (Sarabun)', css: "'Sarabun', 'TH Sarabun New', sans-serif" },
  charm: { name: 'ชาร์ม อาลักษณ์ (Charm)', css: "'Charm', cursive" },
  prompt: { name: 'พร้อมท์ (Prompt)', css: "'Prompt', sans-serif" },
  kanit: { name: 'คณิต (Kanit)', css: "'Kanit', sans-serif" },
  mitr: { name: 'มิตร (Mitr)', css: "'Mitr', sans-serif" },
};

export const DEFAULT_NAME_BLOCK: BlockStyle = {
  x: 50,
  y: 47,
  fontSize: 34,
  color: '#0f172a',
  fontWeight: 'bold',
  textAlign: 'center',
  fontFamily: 'sarabun',
  enabled: true,
  showOrg: false,
};

export const DEFAULT_COURSE_BLOCK: BlockStyle = {
  x: 50,
  y: 62,
  fontSize: 22,
  color: '#1e293b',
  fontWeight: 'bold',
  textAlign: 'center',
  fontFamily: 'sarabun',
  enabled: true,
};

export const DEFAULT_CERT_NO_BLOCK: BlockStyle = {
  x: 88,
  y: 7,
  fontSize: 12,
  color: '#64748b',
  fontWeight: 'normal',
  textAlign: 'right',
  fontFamily: 'sarabun',
  enabled: true,
};

export default function CertificateRenderer({
  attendee,
  config = {},
  className = '',
  showActions = true,
  isEditable = false,
  selectedBlock,
  onSelectBlock,
  onBlockChange,
}: CertificateRendererProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [draggingBlock, setDraggingBlock] = useState<'name' | 'course' | 'cert_no' | null>(null);

  const themeKey = config.template_theme || (config.background_image ? 'custom' : 'classic_blue');
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.classic_blue;
  const isCustomBg = Boolean(config.background_image);

  // Resolved blocks
  const nameBlock: BlockStyle = {
    ...DEFAULT_NAME_BLOCK,
    ...(config.name_block || {}),
  };

  const courseBlock: BlockStyle = {
    ...DEFAULT_COURSE_BLOCK,
    ...(config.course_block || {}),
  };

  const certNoBlock: BlockStyle = {
    ...DEFAULT_CERT_NO_BLOCK,
    ...(config.cert_no_block || {}),
  };

  const displayName = `${attendee.title_name || ''} ${attendee.full_name || ''}`.trim() || 'ชื่อ-นามสกุล ผู้เข้าร่วมโครงการ';
  const displayCourse = config.course_name || attendee.project_title || 'โครงการสัมมนาเชิงปฏิบัติการ';
  const displayCertNo = attendee.certificate_no || `${config.certificate_no_prefix || 'CERT-2569'}-0001`;

  // Drag handling
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, blockKey: 'name' | 'course' | 'cert_no') => {
    if (!isEditable) return;
    e.stopPropagation();
    setDraggingBlock(blockKey);
    onSelectBlock?.(blockKey);
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingBlock || !certRef.current || !onBlockChange) return;

    const rect = certRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const relX = ((clientX - rect.left) / rect.width) * 100;
    const relY = ((clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.max(2, Math.min(98, relX)) * 10) / 10;
    const clampedY = Math.round(Math.max(2, Math.min(98, relY)) * 10) / 10;

    const currentBlock =
      draggingBlock === 'name' ? nameBlock : draggingBlock === 'course' ? courseBlock : certNoBlock;

    onBlockChange(draggingBlock, {
      ...currentBlock,
      x: clampedX,
      y: clampedY,
    });
  }, [draggingBlock, onBlockChange, nameBlock, courseBlock, certNoBlock]);

  useEffect(() => {
    if (!draggingBlock) return;

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setDraggingBlock(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [draggingBlock, handlePointerMove]);

  // Helper for block CSS styling
  const getBlockStyle = (block: BlockStyle) => {
    const textAlign = block.textAlign || 'center';
    let transform = 'translate(-50%, -50%)';
    if (textAlign === 'left') transform = 'translate(0%, -50%)';
    if (textAlign === 'right') transform = 'translate(-100%, -50%)';

    const fontInfo = FONT_FAMILIES[block.fontFamily || 'sarabun'] || FONT_FAMILIES.sarabun;

    return {
      left: `${block.x}%`,
      top: `${block.y}%`,
      transform,
      textAlign,
      fontSize: `${block.fontSize || 24}px`,
      color: block.color || '#0f172a',
      fontWeight: block.fontWeight || 'bold',
      fontFamily: fontInfo.css,
    };
  };

  const handlePrint = () => {
    const printContent = certRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Clean cloned DOM without drag handles/editing outlines
    const clone = printContent.cloneNode(true) as HTMLElement;
    const editingOverlays = clone.querySelectorAll('.designer-handle, .designer-outline');
    editingOverlays.forEach((el) => el.remove());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>เกียรติบัตร - ${displayName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Charm:wght@400;700&family=Kanit:wght@300;400;600;700&family=Mitr:wght@400;600&family=Prompt:wght@300;400;600;700&family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
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
              box-sizing: border-box;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="cert-page">
            ${clone.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Import Google Fonts in Head */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Charm:wght@400;700&family=Kanit:wght@300;400;600;700&family=Mitr:wght@400;600&family=Prompt:wght@300;400;600;700&family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap');
      `}</style>

      {/* Printable / Visual A4 Landscape Certificate Canvas */}
      <div className="w-full max-w-[1000px] overflow-hidden rounded-2xl shadow-2xl border border-slate-300 bg-white relative">
        <div
          ref={certRef}
          className={`relative w-full aspect-[297/210] select-none overflow-hidden ${
            isEditable ? 'cursor-crosshair' : ''
          }`}
          style={{
            backgroundImage: isCustomBg ? `url(${config.background_image})` : undefined,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          onClick={() => {
            if (isEditable && onSelectBlock) {
              onSelectBlock('name');
            }
          }}
        >
          {/* Background Gradient & Frame if not custom image */}
          {!isCustomBg && (
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} pointer-events-none`}>
              {/* Outer Decorative Border */}
              <div className={`absolute inset-3 sm:inset-5 border-[3px] ${theme.outerBorder} pointer-events-none`} />
              {/* Inner Fine Border */}
              <div className={`absolute inset-4 sm:inset-7 border-[1px] ${theme.innerBorder} pointer-events-none opacity-80`} />

              {/* Corner Accents */}
              {theme.cornerAccent !== 'transparent' && (
                <>
                  <svg className="absolute top-4 left-4 sm:top-6 sm:left-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                    <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                    <rect x="0" y="0" width="4" height="25" />
                    <rect x="0" y="0" width="25" height="4" />
                  </svg>
                  <svg className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none rotate-90" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                    <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                    <rect x="0" y="0" width="4" height="25" />
                    <rect x="0" y="0" width="25" height="4" />
                  </svg>
                  <svg className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none -rotate-90" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                    <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                    <rect x="0" y="0" width="4" height="25" />
                    <rect x="0" y="0" width="25" height="4" />
                  </svg>
                  <svg className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-8 h-8 sm:w-12 sm:h-12 pointer-events-none rotate-180" viewBox="0 0 50 50" fill={theme.cornerAccent}>
                    <path d="M0,0 L20,0 C10,0 0,10 0,20 Z" />
                    <rect x="0" y="0" width="4" height="25" />
                    <rect x="0" y="0" width="25" height="4" />
                  </svg>
                </>
              )}
            </div>
          )}

          {/* ========================================================
              BLOCK 1: CERTIFICATE NO. (เลขที่เกียรติบัตร)
          ======================================================== */}
          {certNoBlock.enabled !== false && (
            <div
              className={`absolute cursor-move transition-shadow z-20 ${
                isEditable ? 'group' : ''
              } ${isEditable && selectedBlock === 'cert_no' ? 'ring-2 ring-indigo-500 rounded-md bg-indigo-50/20' : ''}`}
              style={getBlockStyle(certNoBlock)}
              onMouseDown={(e) => handleDragStart(e, 'cert_no')}
              onTouchStart={(e) => handleDragStart(e, 'cert_no')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBlock?.('cert_no');
              }}
            >
              {isEditable && (
                <div className="designer-handle absolute -top-5 left-0 px-1.5 py-0.5 bg-indigo-600 text-[9px] font-bold text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition flex items-center gap-1 pointer-events-none whitespace-nowrap">
                  <Move className="w-2.5 h-2.5" /> เลขที่ ({certNoBlock.x}%, {certNoBlock.y}%)
                </div>
              )}
              <span className="leading-none select-none">
                เลขที่: {displayCertNo}
              </span>
            </div>
          )}

          {/* ========================================================
              BLOCK 2: RECIPIENT NAME (ชื่อ-นามสกุล ผู้รับเกียรติบัตร)
          ======================================================== */}
          {nameBlock.enabled !== false && (
            <div
              className={`absolute cursor-move transition-shadow z-30 ${
                isEditable ? 'group' : ''
              } ${isEditable && selectedBlock === 'name' ? 'ring-2 ring-amber-500 rounded-lg bg-amber-50/20 p-1.5' : 'p-1'}`}
              style={getBlockStyle(nameBlock)}
              onMouseDown={(e) => handleDragStart(e, 'name')}
              onTouchStart={(e) => handleDragStart(e, 'name')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBlock?.('name');
              }}
            >
              {isEditable && (
                <div className="designer-handle absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-600 text-[10px] font-bold text-white rounded shadow-md opacity-0 group-hover:opacity-100 transition flex items-center gap-1 pointer-events-none whitespace-nowrap z-50">
                  <Move className="w-3 h-3" /> บล็อกชื่อ-นามสกุล ({nameBlock.x}%, {nameBlock.y}%)
                </div>
              )}

              <div className="leading-tight tracking-tight select-none">
                {displayName}
              </div>

              {nameBlock.showOrg && (attendee.organization || attendee.position) && (
                <div
                  className="text-[12px] opacity-80 mt-1 font-normal"
                  style={{ color: nameBlock.color || '#334155' }}
                >
                  {attendee.organization} {attendee.position ? `(${attendee.position})` : ''}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              BLOCK 3: PROJECT / COURSE NAME (ชื่อโครงการ/หลักสูตร)
          ======================================================== */}
          {courseBlock.enabled !== false && (
            <div
              className={`absolute cursor-move transition-shadow z-20 ${
                isEditable ? 'group' : ''
              } ${isEditable && selectedBlock === 'course' ? 'ring-2 ring-blue-500 rounded-lg bg-blue-50/20 p-1.5' : 'p-1'}`}
              style={getBlockStyle(courseBlock)}
              onMouseDown={(e) => handleDragStart(e, 'course')}
              onTouchStart={(e) => handleDragStart(e, 'course')}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBlock?.('course');
              }}
            >
              {isEditable && (
                <div className="designer-handle absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-600 text-[10px] font-bold text-white rounded shadow-md opacity-0 group-hover:opacity-100 transition flex items-center gap-1 pointer-events-none whitespace-nowrap z-50">
                  <Move className="w-3 h-3" /> บล็อกชื่อโครงการ ({courseBlock.x}%, {courseBlock.y}%)
                </div>
              )}

              <div className="leading-snug max-w-3xl px-2 select-none">
                {displayCourse}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ / บันทึกเป็น PDF (A4 แนวนอน)</span>
          </button>
        </div>
      )}
    </div>
  );
}
