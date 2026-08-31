'use client';

import React, { useState } from 'react';
import { useSettings } from '@/lib/settings-context';
import OnePageSummaryReport from './OnePageSummaryReport';
import FullBookletReport from './FullBookletReport';
import {
  FileText,
  BookOpen,
  Printer,
  Download,
  X,
  Sparkles,
} from 'lucide-react';

interface ProjectSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
}

export default function ProjectSummaryModal({
  isOpen,
  onClose,
  project,
}: ProjectSummaryModalProps) {
  const { collegeName, directorName, directorPosition } = useSettings();
  const [reportType, setReportType] = useState<'ONE_PAGE' | 'FULL_BOOKLET'>('ONE_PAGE');

  if (!isOpen || !project) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header Bar - Hidden on Print */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-theme bg-theme-primary flex items-center justify-center font-bold text-white shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">ศูนย์สรุปผลโครงการ (Project Summary & Report)</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  อนุมัติแล้ว
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-md">{project.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร ({reportType === 'ONE_PAGE' ? 'สรุป ๑ แผ่น' : 'รูปเล่ม'})</span>
            </button>

            <a
              href={'/api/v1/projects/' + project.id + '/export-summary-docx'}
              download
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด Word (.docx)</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Type Selector Tabs - Hidden on Print */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2 shrink-0 no-print">
          <button
            onClick={() => setReportType('ONE_PAGE')}
            className={'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-theme text-xs font-bold transition ' + (
              reportType === 'ONE_PAGE'
                ? 'bg-white text-theme-primary shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            )}
          >
            <FileText className="w-4 h-4 text-theme-primary" />
            <span>๑. สรุปแผ่นเดียว (One-Page Executive Summary)</span>
          </button>

          <button
            onClick={() => setReportType('FULL_BOOKLET')}
            className={'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-theme text-xs font-bold transition ' + (
              reportType === 'FULL_BOOKLET'
                ? 'bg-white text-theme-primary shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            )}
          >
            <BookOpen className="w-4 h-4 text-theme-primary" />
            <span>๒. สรุปแบบรูปเล่ม (Full Booklet Report)</span>
          </button>
        </div>

        {/* Report Viewer Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/70 flex justify-center flex-1 print:p-0 print:bg-white print:overflow-visible">
          {reportType === 'ONE_PAGE' ? (
            <OnePageSummaryReport
              project={project}
              collegeName={collegeName}
              directorName={directorName}
              directorPosition={directorPosition}
            />
          ) : (
            <FullBookletReport
              project={project}
              collegeName={collegeName}
              directorName={directorName}
              directorPosition={directorPosition}
            />
          )}
        </div>
      </div>
    </div>
  );
}
