'use client';

import React from 'react';
import { useSettings } from '@/lib/settings-context';
import OnePageSummaryReport from './OnePageSummaryReport';
import {
  FileText,
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

  if (!isOpen || !project) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed-none overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header Bar - Hidden on Print */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-theme bg-theme-primary flex items-center justify-center font-bold text-white shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">สรุปผลโครงการแผ่นเดียว (One-Page Executive Summary)</h2>
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
              <span>พิมพ์เอกสารสรุป ๑ แผ่น</span>
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

        {/* Report Viewer Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/70 flex justify-center flex-1 print:p-0 print:bg-white print:overflow-visible">
          <OnePageSummaryReport
            project={project}
            collegeName={collegeName}
            directorName={directorName}
            directorPosition={directorPosition}
          />
        </div>
      </div>
    </div>
  );
}
