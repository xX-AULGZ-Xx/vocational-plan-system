'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { showAlert } from '@/lib/sweetalert';
import {
  Save,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const projectId = params.id as string;
  const templateId = searchParams.get('templateId');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Project context data
  const [project, setProject] = useState<any>(null);

  // Template data
  const [template, setTemplate] = useState<any>(null);

  // Dynamic tags
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [divisionsData, setDivisionsData] = useState<any[]>([]);

  useEffect(() => {
    if (projectId && templateId && token) {
      fetchData();
    }
  }, [projectId, templateId, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Project
      const resProj = await fetch(`/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataProj = await resProj.json();
      if (!dataProj.success) throw new Error('ไม่พบข้อมูลโครงการ');
      
      const proj = dataProj.data;
      setProject(proj);

      // Fetch Template
      const resTpl = await fetch(`/api/v1/admin/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataTpl = await resTpl.json();
      if (!dataTpl.success) throw new Error('ไม่พบแบบฟอร์มสรุป');
      
      const tpl = dataTpl.data;
      setTemplate(tpl);

      // Initialize dynamic data
      const initial: Record<string, any> = {};
      const projDynamic = typeof proj.dynamic_data === 'string' 
        ? JSON.parse(proj.dynamic_data) 
        : (proj.dynamic_data || {});

      tpl.tags?.forEach((t: any) => {
        const key = t.tag_name;
        // Map from core project fields if match
        if (key === 'title' || key === 'project_name') {
           initial[key] = proj.title;
        } else if (key === 'fiscal_year') {
           initial[key] = proj.fiscal_year;
        } else if (key === 'budget' || key === 'total_budget') {
           initial[key] = proj.total_budget;
        } else if (key === 'department') {
           initial[key] = proj.department?.name;
        } else if (key === 'project_code') {
           initial[key] = proj.project_code;
        } else if (projDynamic[key] !== undefined) {
           initial[key] = projDynamic[key];
        } else {
           // default empty
           if (t.tag_type === 'TABLE_LOOP') initial[key] = [{}];
           else if (t.tag_type === 'BOOLEAN') initial[key] = false;
           else initial[key] = '';
        }
      });
      setDynamicData(initial);

    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicChange = (key: string, value: any) => {
    setDynamicData(prev => ({ ...prev, [key]: value }));
  };

  const handlePreview = async (format: 'docx' | 'pdf') => {
    if (!template) return;
    try {
      const res = await fetch('/api/v1/documents/export-dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: template.id,
          formData: dynamicData,
          format
        })
      });
      
      const data = await res.json();
      if (data.success) {
        window.location.href = data.download_url;
      } else {
        showAlert.error('สร้างตัวอย่างไม่สำเร็จ', data.message);
      }
    } catch (e) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างตัวอย่าง');
    }
  };

  const renderTagInput = (tag: any) => {
    const key = tag.tag_name;
    const value = dynamicData[key];
    const label = tag.label || tag.tag_name;
    const isEditing = true;

    switch (tag.tag_type) {
      case 'LONGTEXT':
        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <textarea
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              rows={4}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
      case 'DIVISION_DROPDOWN':
        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกฝ่าย / กลุ่มงาน --</option>
              {(typeof divisionsData !== 'undefined' ? divisionsData : []).map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        );
      case 'DEPARTMENT_DROPDOWN': {
        const allDepts = (typeof divisionsData !== 'undefined' ? divisionsData : []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []);
        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกแผนกวิชา / งาน --</option>
              {allDepts.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        );
      }
      case 'ALIGNMENT_CHECKLIST': {
        const valObj = typeof value === 'object' && value !== null ? value : {};
        const toggleCheck = (k: string) => {
          handleDynamicChange(key, { ...valObj, [k]: !valObj[k] });
        };
        const optionsList = Array.isArray(tag.options) ? tag.options : [];
        const CheckItem = ({ k, label, indent }: { k: string; label: string; indent: number }) => {
          let marginClass = "";
          if (indent === 1) marginClass = "ml-6";
          if (indent === 2) marginClass = "ml-12";
          return (
            <div className={`flex items-start space-x-2 ${marginClass}`}>
              <input type="checkbox" checked={valObj[k] || false} onChange={() => toggleCheck(k)} disabled={!isEditing} className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100" />
              <label className="text-sm text-gray-700 leading-snug cursor-pointer" onClick={() => { if(isEditing) toggleCheck(k); }}>{label}</label>
            </div>
          );
        };

        return (
          <div key={key} className="col-span-1 lg:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-900">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="space-y-2">
              {optionsList.length > 0 ? optionsList.map((opt: any, idx: number) => {
                const item = typeof opt === 'string' ? { key: `chk_${idx}`, label: opt, indent: 0 } : opt;
                return <CheckItem key={idx} k={item.key} label={item.label} indent={item.indent} />;
              }) : (
                <div className="text-sm text-gray-500 italic">ไม่มีหัวข้อประเมิน (กรุณาเพิ่มในหน้าจัดการแม่แบบ)</div>
              )}
            </div>
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
              <strong>💡 วิธีใช้ในเอกสาร Word:</strong> ครอบส่วนที่เป็นกลุ่มนี้ด้วย <code>&#123;#{tag.tag_name}&#125;</code>...<code>&#123;/{tag.tag_name}&#125;</code> จากนั้นใช้ตัวแปร เช่น <code>&#123;q_voc_chk&#125;</code> (นำชื่อตัวแปรที่ตั้งไว้มาต่อท้ายด้วย _chk) เพื่อแสดงเครื่องหมาย ☑ หรือ ☐ อัตโนมัติ
            </div>
          </div>
        );
      }
      case 'TIMELINE': {
        const defaultSteps = [
          "1. เสนอโครงการ (PLAN)",
          "2. ดำเนินการตามโครงการ (DO)",
          "3. การประเมินผลการดำเนินงานโครงการ/การติดตามผล/สรุปผล (CHECK)",
          "4. รายงานผล (Act)"
        ];
        const months = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
        const timelineData = Array.isArray(value) && value.length > 0 ? value : defaultSteps.map(s => ({ step_name: s, m1: "", m1_check: "", m1_bullet: "", m2: "", m2_check: "", m2_bullet: "", m3: "", m3_check: "", m3_bullet: "", m4: "", m4_check: "", m4_bullet: "", m5: "", m5_check: "", m5_bullet: "", m6: "", m6_check: "", m6_bullet: "", m7: "", m7_check: "", m7_bullet: "", m8: "", m8_check: "", m8_bullet: "", m9: "", m9_check: "", m9_bullet: "", m10: "", m10_check: "", m10_bullet: "", m11: "", m11_check: "", m11_bullet: "", m12: "", m12_check: "", m12_bullet: "" }));

        return (
          <div key={key} className="col-span-1 lg:col-span-2 overflow-hidden">
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 border-r w-1/3">ขั้นตอนการดำเนินงาน</th>
                    {months.map((m, i) => (
                      <th key={i} className="px-1 py-2 text-center font-medium text-gray-500 border-r min-w-[30px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timelineData.map((row, rIndex) => (
                    <tr key={rIndex}>
                      <td className="px-3 py-2 border-r whitespace-normal">{row.step_name}</td>
                      {Array.from({ length: 12 }).map((_, cIndex) => {
                        const mKey = 'm' + (cIndex + 1);
                        return (
                          <td key={cIndex} className="px-1 py-2 border-r text-center">
                            <input
                              type="checkbox"
                              checked={row[mKey] === "/"}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const newData = [...timelineData];
                                const row = { ...newData[rIndex] };
                                
                                if (isChecked) {
                                  let minIdx = cIndex;
                                  let maxIdx = cIndex;
                                  for (let i = 0; i < 12; i++) {
                                    if (row['m' + (i + 1)] === '/') {
                                      if (i < minIdx) minIdx = i;
                                      if (i > maxIdx) maxIdx = i;
                                    }
                                  }
                                  for (let i = minIdx; i <= maxIdx; i++) {
                                    const k = 'm' + (i + 1);
                                    row[k] = "/";
                                    row[k+"_check"] = "\u2713";
                                    row[k+"_bullet"] = "\u25CF";
                                  }
                                } else {
                                  row[mKey] = "";
                                  row[mKey+"_check"] = "";
                                  row[mKey+"_bullet"] = "";
                                }
                                
                                newData[rIndex] = row;
                                handleDynamicChange(key, newData);
                              }}
                              disabled={!isEditing}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">คำแนะนำการใช้ตัวแปร: ให้ครอบตารางด้วย &#123;#{tag.tag_name}&#125; ... &#123;/{tag.tag_name}&#125; และใช้ตัวแปร &#123;step_name&#125; และ &#123;m1&#125; ถึง &#123;m12&#125; ในช่องต่างๆ</p>
          </div>
        );
      }
      case 'DATERANGE':
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={value?.start || ''}
                onChange={(e) => handleDynamicChange(key, { ...(value || {}), start: e.target.value })}
                disabled={!isEditing}
                required={tag.is_required}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-gray-500 text-sm">ถึง</span>
              <input
                type="date"
                value={value?.end || ''}
                onChange={(e) => handleDynamicChange(key, { ...(value || {}), end: e.target.value })}
                disabled={!isEditing}
                required={tag.is_required}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        );
      case 'DATE':
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <input
              type="date"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
      case 'DROPDOWN':
        const options = Array.isArray(tag.options) ? tag.options : [];
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- กรุณาเลือก --</option>
              {options.map((opt: any, i: number) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      case 'BOOLEAN':
        return (
          <div key={key} className="flex items-center pt-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleDynamicChange(key, e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  {tag.description && <span className="text-xs text-gray-500 font-normal mt-0.5">{tag.description}</span>}
                </div>
            </label>
          </div>
        );
      case 'TABLE_LOOP':
        return (
          <div key={key} className="col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <button
                type="button"
                onClick={() => {
                  const arr = Array.isArray(value) ? [...value] : [];
                  const maxItems = (tag.options && !Array.isArray(tag.options) && typeof tag.options === 'object') ? tag.options.maxItems : null;
                  if (maxItems && arr.length >= maxItems) {
                    showAlert.warning('จำกัดจำนวนรายการ', `เพิ่มได้สูงสุด ${maxItems} รายการเท่านั้นครับ`);
                    return;
                  }
                  arr.push({});
                  handleDynamicChange(key, arr);
                }}
                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded flex items-center hover:bg-indigo-200"
              >
                <Plus className="w-3 h-3 mr-1" /> เพิ่มรายการ
              </button>
            </div>
            {Array.isArray(value) && value.map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-center mb-2 bg-white p-2 rounded border">
                <span className="text-xs text-gray-400 font-medium w-4">{i+1}</span>
                <input
                  type="text"
                  placeholder="รายละเอียด..."
                  value={item.description || ''}
                  onChange={(e) => {
                     const arr = [...value];
                     arr[i] = { ...arr[i], description: e.target.value };
                     handleDynamicChange(key, arr);
                  }}
                  className="flex-1 text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                     const arr = [...value];
                     arr.splice(i, 1);
                     handleDynamicChange(key, arr);
                  }}
                  className="text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        );
      case 'IMAGE':
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleDynamicChange(key, (reader.result as string).split(',')[1]); // Store base64 data
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-sm"
              />
              <input 
                type="number" 
                placeholder="กว้าง" 
                onChange={(e) => {
                   const sizeKey = key + '_size';
                   const currentSize = dynamicData[sizeKey] || [150, 150];
                   handleDynamicChange(sizeKey, [parseInt(e.target.value) || 150, currentSize[1]]);
                }}
                className="w-20 text-sm border-gray-300 rounded" 
                title="ความกว้าง (px)"
              />
              <input 
                type="number" 
                placeholder="สูง" 
                onChange={(e) => {
                   const sizeKey = key + '_size';
                   const currentSize = dynamicData[sizeKey] || [150, 150];
                   handleDynamicChange(sizeKey, [currentSize[0], parseInt(e.target.value) || 150]);
                }}
                className="w-20 text-sm border-gray-300 rounded"
                title="ความสูง (px)" 
              />
            </div>
          </div>
        );
      default:
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <input
              type={tag.tag_type === 'CALCULATION' ? 'number' : 'text'}
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-12 text-center text-red-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-bold">{errorMsg}</h2>
        <Link href="/my-projects" className="mt-4 inline-block text-indigo-600 hover:underline">กลับไปหน้า My Projects</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/my-projects" className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สร้างรายงานสรุปโครงการ</h1>
          <p className="text-gray-500 mt-1">อ้างอิงจากโครงการ: <span className="font-semibold text-indigo-700">{project?.title}</span></p>
        </div>
      </div>

      <form className="space-y-6">
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-medium text-gray-900">ฟอร์มกรอกข้อมูลสรุป ({template?.name})</h2>
          </div>
          
          <div className="flex flex-col gap-6">
            {template?.tags?.length === 0 ? (
               <div className="col-span-2 text-center py-10 text-gray-400">
                 ไม่พบการตั้งค่า Tag ในแม่แบบนี้
               </div>
            ) : (
               template?.tags?.filter((t: any) => !(t.options && typeof t.options === 'object' && !Array.isArray(t.options) && t.options.is_hidden)).map((tag: any) => renderTagInput(tag))
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => handlePreview('docx')}
            className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            ดาวน์โหลด .docx
          </button>
          <button
            type="button"
            onClick={() => handlePreview('pdf')}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            พรีวิว PDF จำลอง
          </button>
        </div>
      </form>
    </div>
  );
}
