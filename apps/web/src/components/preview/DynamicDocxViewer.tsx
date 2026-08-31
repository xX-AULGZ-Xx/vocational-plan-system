'use client';

import React from 'react';
import { DocxScanResult, DocxPage, DocxParagraph, DocxTable, DocxImageItem } from '@/lib/docx-scanner';
import { Image as ImageIcon } from 'lucide-react';

interface DynamicDocxViewerProps {
  scanResult: DocxScanResult;
  variablesData?: Record<string, string | number>;
  fallbackImages?: Record<string, string>;
}

export default function DynamicDocxViewer({
  scanResult,
  variablesData = {},
  fallbackImages = {},
}: DynamicDocxViewerProps) {
  if (!scanResult || !scanResult.pages || scanResult.pages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans">
        ไม่พบโครงสร้างเอกสาร หรืออยู่ระหว่างประมวลผล
      </div>
    );
  }

  const sanitizeAndReplace = (text: string): string => {
    if (!text) return '';
    let clean = text.replace(/<[^>]+>/g, '').trim();

    clean = clean.replace(/\{+([a-zA-Z0-9_\-]+)\}+/g, (match, varName) => {
      const trimmedVar = varName.trim();
      if (variablesData[trimmedVar] !== undefined && variablesData[trimmedVar] !== null && variablesData[trimmedVar] !== '') {
        return String(variablesData[trimmedVar]);
      }
      if (trimmedVar === 'doc_date_full' && variablesData['today_thai']) return String(variablesData['today_thai']);
      if (trimmedVar === 'project_name' && variablesData['title']) return String(variablesData['title']);
      if (trimmedVar === 'responsible_person' && variablesData['leader_name']) return String(variablesData['leader_name']);
      if (trimmedVar === 'responsible_position' && variablesData['leader_position']) return String(variablesData['leader_position']);
      if (trimmedVar === 'department_name') return String(variablesData['department_name'] || 'แผนกวิชาเทคโนโลยีสารสนเทศ');
      if (trimmedVar === 'sub_division') return String(variablesData['sub_division'] || 'ฝ่ายวิชาการ');
      return match;
    });

    return clean;
  };

  return (
    <div className="space-y-8 w-full max-w-[210mm] mx-auto text-[#000000] leading-[1.25]" style={{ fontFamily: "'TH SarabunIT9', 'TH Sarabun PSK', 'Sarabun', sans-serif" }}>
      <style jsx global>{`
        .thai-distributed {
          text-align: justify !important;
          text-justify: inter-cluster !important;
          text-align-last: left !important;
          word-break: break-word !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          line-break: strict !important;
        }
      `}</style>

      {scanResult.pages.map((page: DocxPage, pIdx: number) => {
        const isPage1 = page.pageNumber === 1;
        const isPage2 = page.pageNumber === 2;

        if (isPage1) {
          return (
            <div
              key={pIdx}
              className="min-h-[297mm] max-h-[297mm] bg-white p-[20mm] sm:p-[25mm] border border-slate-200 shadow-xl print:shadow-none print:border-none print:m-0 flex flex-col justify-start box-border text-[16pt] overflow-hidden"
            >
              {/* Header with Garuda on left & 29pt Centered Title */}
              <div className="relative pt-1 pb-1 mb-2">
                <div className="absolute left-0 top-0">
                  <img
                    src="/template-media/image1.jpeg"
                    alt="ตราครุฑ"
                    className="w-[58px] h-[64px] object-contain"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <h1 className="text-center text-[29pt] font-bold tracking-wide text-black pb-1">
                  บันทึกข้อความ
                </h1>
              </div>

              {/* Memo Headers: 20pt Bold Headers, 16pt Content */}
              <div className="space-y-1.5 text-[16pt] pt-1">
                <div className="flex items-baseline">
                  <span className="font-bold text-[20pt] shrink-0 mr-2">ส่วนราชการ</span>
                  <span className="flex-1 border-b border-dotted border-black pb-0.5 text-[16pt]">
                    {variablesData.department_name || 'แผนกวิชาเทคโนโลยีสารสนเทศ'} {variablesData.college_name || 'วิทยาลัยการอาชีพเชียงราย'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline flex-1">
                    <span className="font-bold text-[20pt] shrink-0 mr-2">ที่</span>
                    <span className="flex-1 border-b border-dotted border-black pb-0.5"></span>
                  </div>
                  <div className="flex items-baseline flex-1">
                    <span className="font-bold text-[20pt] shrink-0 mr-2">วันที่</span>
                    <span className="flex-1 border-b border-dotted border-black pb-0.5 text-[16pt]">
                      {variablesData.doc_date_full || variablesData.today_thai || '๒๐ สิงหาคม ๒๕๖๙'}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline">
                  <span className="font-bold text-[20pt] shrink-0 mr-2">เรื่อง</span>
                  <span className="flex-1 border-b border-dotted border-black pb-0.5 font-bold text-[16pt]">
                    {variablesData.project_name || variablesData.title || ''}
                  </span>
                </div>

                <div className="flex items-baseline pt-0.5">
                  <span className="font-bold text-[16pt] shrink-0 mr-2">เรียน</span>
                  <span className="text-[16pt]">{variablesData.director_position || 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย'}</span>
                </div>
              </div>

              {/* Body Content: 16pt Thai Distributed */}
              <div className="space-y-3 pt-3 text-[16pt] leading-[1.25]">
                <p className="thai-distributed indent-[2.5cm]">
                  ตามที่ {variablesData.sub_division || 'ฝ่ายวิชาการ'} {variablesData.department_name || 'แผนกวิชาเทคโนโลยีสารสนเทศ'} ได้ดำเนินงาน <span className="font-bold">{variablesData.project_name || variablesData.title}</span> ขึ้น เพื่อเป็นการ {variablesData.rationale || 'พัฒนาทักษะและเสริมสร้างสมรรถนะวิชาชีพ'} ให้แก่นักเรียน นักศึกษา{variablesData.college_name || 'วิทยาลัยการอาชีพเชียงราย'} ซึ่งสอดคล้องกับกรอบทิศทางการพัฒนา{variablesData.college_name || 'วิทยาลัยการอาชีพเชียงราย'} ประจำปีการศึกษา {variablesData.fiscal_year || '๒๕๖๙'} โดยได้จัดโครงการดังกล่าวขึ้น ในวันที่ {variablesData.start_date || '๑ กันยายน ๒๕๖๙'} {variablesData.location_full || 'วิทยาลัยการอาชีพเชียงราย'}
                </p>

                <p className="thai-distributed indent-[2.5cm]">
                  การดำเนินโครงการดังกล่าว ได้เสร็จสิ้นเป็นที่เรียบร้อยแล้ว {variablesData.sub_division || 'ฝ่ายวิชาการ'} {variablesData.department_name || 'แผนกวิชาเทคโนโลยีสารสนเทศ'} จึงขออนุญาตรายงานผล การดำเนินงานโครงการดังเอกสารที่แนบ
                </p>

                <p className="thai-distributed indent-[2.5cm]">
                  จึงเรียนมาเพื่อโปรดทราบ และพิจารณา
                </p>
              </div>

              {/* Sender Signature */}
              <div className="flex justify-end pt-6 mt-4">
                <div className="text-center w-[7.5cm] space-y-1">
                  <p className="font-bold text-[16pt]">( {variablesData.responsible_person || variablesData.leader_name} )</p>
                  <p className="text-[16pt]">ตำแหน่ง {variablesData.responsible_position || variablesData.leader_position}</p>
                </div>
              </div>
            </div>
          );
        }

        if (isPage2) {
          return (
            <div
              key={pIdx}
              className="min-h-[297mm] max-h-[297mm] bg-white p-[20mm] sm:p-[25mm] border border-slate-200 shadow-xl print:shadow-none print:border-none print:m-0 flex flex-col justify-between text-center box-border relative overflow-hidden text-[#000000]"
            >
              {/* Top Section */}
              <div className="space-y-3 pt-1">
                <div className="flex justify-center pb-1">
                  <img
                    src="/template-media/image2.jpg"
                    alt="ตราสัญลักษณ์วิทยาลัยการอาชีพเชียงราย"
                    className="w-[120px] h-[120px] object-contain"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                <h1 className="text-[28pt] font-bold text-black tracking-wide">
                  รายงานผลการดำเนินงาน
                </h1>
                <h2 className="text-[20pt] font-bold text-black leading-tight max-w-xl mx-auto py-0.5">
                  {variablesData.project_name || variablesData.title}
                </h2>
                <p className="text-[20pt] font-bold text-black">
                  ประจำปีงบประมาณ {variablesData.fiscal_year}
                </p>

                {variablesData.cover_image ? (
                  <div
                    className="mx-auto rounded-xl overflow-hidden shadow-sm border border-slate-200 my-2 flex items-center justify-center bg-slate-50"
                    style={{ width: '4.8in', height: '3.3in' }}
                  >
                    <img
                      src={String(variablesData.cover_image)}
                      alt="รูปภาพหน้าปกโครงการ"
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        e.target.src = 'https://placehold.co/600x400/e2e8f0/475569?text=Cover+Image';
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="mx-auto rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1.5 p-2 my-2"
                    style={{ width: '4.8in', height: '3.3in' }}
                  >
                    <ImageIcon className="w-10 h-10 text-slate-400" />
                    <span className="text-[13pt] font-sans text-slate-500">รูปภาพหน้าปกโครงการ (ขนาด 4.8" x 3.3")</span>
                  </div>
                )}
              </div>

              {/* Middle Section: Centered Exactly like Word Template */}
              <div className="my-auto py-3 mx-auto w-full text-center space-y-2 text-[18pt]">
                <p className="text-center text-[18pt] font-bold">
                  ชื่อ <span className="font-normal text-[18pt] inline-block border-b border-dotted border-black min-w-[280px] pb-0.5">{variablesData.responsible_person || variablesData.leader_name}</span>
                </p>
                <p className="text-center text-[18pt] font-bold">
                  ตำแหน่ง <span className="font-normal text-[18pt] inline-block border-b border-dotted border-black min-w-[280px] pb-0.5">{variablesData.responsible_position || variablesData.leader_position}</span>
                </p>
                <p className="text-center text-[18pt] font-bold">
                  ฝ่าย,งาน,แผนกวิชา <span className="font-normal text-[18pt] inline-block border-b border-dotted border-black min-w-[280px] pb-0.5">{variablesData.sub_division || 'ฝ่ายวิชาการ'} {variablesData.department_name || 'แผนกวิชาเทคโนโลยีสารสนเทศ'}</span>
                </p>
              </div>

              {/* Bottom Section: 22pt Bold Organizations */}
              <div className="space-y-1 pt-4 pb-2 text-[22pt]">
                <p className="font-bold text-black text-[22pt]">{variablesData.college_name || 'วิทยาลัยการอาชีพเชียงราย'}</p>
                <p className="font-bold text-black text-[22pt]">สำนักงานอาชีวศึกษาจังหวัดเชียงราย</p>
                <p className="font-bold text-black text-[22pt]">สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ</p>
              </div>
            </div>
          );
        }

        return (
          <div
            key={pIdx}
            className="min-h-[297mm] bg-white p-[18mm] sm:p-[22mm] border border-slate-200 shadow-xl print:shadow-none print:border-none print:m-0 flex flex-col justify-between box-border text-[16pt] text-black leading-relaxed"
          >
            <div className="space-y-2.5">
              {page.elements.map((el, elIdx) => {
                if (el.type === 'paragraph' && el.paragraph) {
                  const p = el.paragraph;
                  const isCenter = p.align === 'center';
                  const isRight = p.align === 'right';
                  const isThaiDistribute = p.align === 'thaiDistribute';
                  const alignClass = isCenter ? 'text-center' : isRight ? 'text-right' : isThaiDistribute ? 'thai-distributed' : 'text-left';

                  const cleanedText = sanitizeAndReplace(p.text);
                  if (!cleanedText && (!p.images || p.images.length === 0)) return null;

                  return (
                    <div
                      key={elIdx}
                      className={`w-full ${alignClass} leading-[1.35]`}
                      style={{
                        textIndent: p.firstLineIndentCm ? `${p.firstLineIndentCm}cm` : undefined,
                      }}
                    >
                      {/* Render Images */}
                      {p.images && p.images.length > 0 && (
                        <div className={`flex ${isCenter ? 'justify-center' : isRight ? 'justify-end' : 'justify-start'} py-2 gap-3`}>
                          {p.images.map((img: DocxImageItem, imgIdx: number) => {
                            const src = img.src || fallbackImages[img.id];
                            return (
                              <div
                                key={imgIdx}
                                className="border border-slate-300 rounded-lg overflow-hidden flex flex-col items-center justify-center bg-slate-50 relative"
                                style={{
                                  width: img.widthCm ? `${img.widthCm}cm` : `${img.widthPx}px`,
                                  height: img.heightCm ? `${img.heightCm}cm` : `${img.heightPx}px`,
                                  maxWidth: '100%',
                                }}
                              >
                                {src ? (
                                  <img
                                    src={src}
                                    alt="รูปภาพในเอกสาร"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-2">
                                    <ImageIcon className="w-8 h-8 text-slate-400" />
                                    <span className="text-[11pt] font-sans text-slate-500 text-center">
                                      ((กรอบรูปภาพ {img.widthCm} x {img.heightCm} ซม.))
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Runs with exact font sizes */}
                      {p.runs && p.runs.length > 0 ? (
                        p.runs.map((run, rIdx) => {
                          const rText = sanitizeAndReplace(run.text);
                          if (!rText) return null;
                          return (
                            <span
                              key={rIdx}
                              style={{
                                fontSize: run.fontSizePt ? `${run.fontSizePt}pt` : '16pt',
                                fontWeight: run.isBold ? 'bold' : 'normal',
                                fontStyle: run.isItalic ? 'italic' : 'normal',
                              }}
                            >
                              {rText}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[16pt]">{cleanedText}</span>
                      )}
                    </div>
                  );
                } else if (el.type === 'table' && el.table) {
                  const tbl = el.table;
                  return (
                    <div key={elIdx} className="w-full my-3 overflow-x-auto">
                      <table className="w-full border-collapse border border-black text-[14pt]">
                        <tbody>
                          {tbl.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={row.isHeader ? 'bg-slate-100 font-bold' : undefined}
                            >
                              {row.cells.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  colSpan={cell.gridSpan || 1}
                                  className={`p-1.5 border border-black ${
                                    cell.align === 'center'
                                      ? 'text-center'
                                      : cell.align === 'right'
                                      ? 'text-right'
                                      : 'text-left'
                                  }`}
                                >
                                  {cell.runs && cell.runs.length > 0 ? (
                                    cell.runs.map((run, runIdx) => (
                                      <span
                                        key={runIdx}
                                        style={{
                                          fontSize: run.fontSizePt ? `${run.fontSizePt}pt` : '14pt',
                                          fontWeight: run.isBold ? 'bold' : 'normal',
                                        }}
                                      >
                                        {sanitizeAndReplace(run.text)}
                                      </span>
                                    ))
                                  ) : (
                                    <span>{sanitizeAndReplace(cell.text)}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            <div className="border-t border-slate-300 pt-2 text-center text-slate-400 text-[10pt] font-sans no-print">
              หน้า {page.pageNumber} / {scanResult.totalPages}
            </div>
          </div>
        );
      })}
    </div>
  );
}
