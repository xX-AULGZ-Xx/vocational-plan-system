'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { showAlert } from '@/lib/sweetalert';
import { useSettings } from '@/lib/settings-context';
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
  const {
    collegeName,
    directorName,
    directorPosition,
    deputyAcadName,
    deputyAcadPosition,
    deputyResName,
    deputyResPosition,
    deputyDevName,
    deputyDevPosition,
    deputyStratName,
    deputyStratPosition,
    planningHeadName,
    planningHeadPosition,
  } = useSettings();
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
  }, [projectId, templateId, token, planningHeadName]);

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

      // Fetch Divisions
      try {
        const resDiv = await fetch('/api/v1/divisions', { headers: { Authorization: `Bearer ${token}` } });
        const dataDiv = await resDiv.json();
        if (dataDiv.success) setDivisionsData(dataDiv.data);
      } catch (e) {
        console.error(e);
      }

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
        } else if (t.tag_type === 'LEADER_NAME' || key === 'leader_name') {
           initial[key] = proj.leader?.full_name || user?.full_name || '';
        } else if (t.tag_type === 'LEADER_POSITION' || key === 'leader_position') {
           const userDept = user?.department;
           if (userDept) {
             if (user?.role === 'HEAD_DEPT' || (user as any)?.is_head) {
               initial[key] = userDept.name.startsWith('งาน') || userDept.name.startsWith('แผนก') 
                 ? `หัวหน้า${userDept.name}` 
                 : `หัวหน้างาน${userDept.name}`;
             } else if (user?.position === 'เจ้าหน้าที่') {
               initial[key] = userDept.name.startsWith('งาน') || userDept.name.startsWith('แผนก')
                 ? `เจ้าหน้าที่${userDept.name}`
                 : `เจ้าหน้าที่งาน${userDept.name}`;
             } else {
               initial[key] = userDept.name.startsWith('แผนก') 
                 ? `ครูประจำ${userDept.name}` 
                 : (userDept.name.startsWith('งาน') ? `ครูผู้ช่วย${userDept.name}` : `ครูประจำแผนกวิชา${userDept.name}`);
             }
           } else {
             initial[key] = proj.leader?.position || user?.position || 'ครู';
           }
        } else if (t.tag_type === 'DIRECTOR_NAME' || key === 'director_name') {
           initial[key] = directorName || '';
        } else if (t.tag_type === 'DIRECTOR_POSITION' || key === 'director_position') {
           initial[key] = directorPosition || '';
        } else if (t.tag_type === 'COLLEGE_NAME' || key === 'college_name') {
           initial[key] = collegeName || '';
        } else if (t.tag_type === 'PLANNING_HEAD_NAME' || key === 'planning_head_name') {
           initial[key] = planningHeadName || '';
        } else if (t.tag_type === 'PLANNING_HEAD_POSITION' || key === 'planning_head_position') {
           initial[key] = planningHeadPosition || 'หัวหน้างานวางแผนและงบประมาณ';
        } else if (t.tag_type === 'DEPUTY_ACAD_NAME' || key === 'deputy_acad_name') {
           initial[key] = deputyAcadName || '';
        } else if (t.tag_type === 'DEPUTY_ACAD_POSITION' || key === 'deputy_acad_position') {
           initial[key] = deputyAcadPosition || '';
        } else if (t.tag_type === 'DEPUTY_RES_NAME' || key === 'deputy_res_name') {
           initial[key] = deputyResName || '';
        } else if (t.tag_type === 'DEPUTY_RES_POSITION' || key === 'deputy_res_position') {
           initial[key] = deputyResPosition || '';
        } else if (t.tag_type === 'DEPUTY_DEV_NAME' || key === 'deputy_dev_name') {
           initial[key] = deputyDevName || '';
        } else if (t.tag_type === 'DEPUTY_DEV_POSITION' || key === 'deputy_dev_position') {
           initial[key] = deputyDevPosition || '';
        } else if (t.tag_type === 'DEPUTY_STRAT_NAME' || key === 'deputy_strat_name') {
           initial[key] = deputyStratName || '';
        } else if (t.tag_type === 'DEPUTY_STRAT_POSITION' || key === 'deputy_strat_position') {
           initial[key] = deputyStratPosition || '';
        } else if (t.tag_type === 'HEAD_NAME' || key === 'head_name') {
           const userDept = (divisionsData || []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []).find((d: any) => d.id === (proj.department_id || user?.department?.id || (user as any)?.department_id));
           initial[key] = userDept?.head_name || '';
        } else if (t.tag_type === 'HEAD_POSITION' || key === 'head_position') {
           const userDept = (divisionsData || []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []).find((d: any) => d.id === (proj.department_id || user?.department?.id || (user as any)?.department_id));
           initial[key] = userDept?.head_position || (userDept ? `หัวหน้า${userDept.name}` : 'หัวหน้างาน');
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
      case 'DEPUTY_DROPDOWN': {
        const dynamicDeputies = (typeof divisionsData !== 'undefined' && divisionsData?.length > 0)
          ? divisionsData.map((div: any) => ({
              id: div.id,
              name: div.deputy_name || `รองผู้อำนวยการ${div.name}`,
              rawName: div.deputy_name || '',
              division: div.name,
              code: div.code,
              position: div.deputy_position || `รองผู้อำนวยการ${div.name}`,
            }))
          : [
              { id: 2, name: deputyResName || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร', rawName: deputyResName, division: 'ฝ่ายบริหารทรัพยากร', position: deputyResPosition || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร' },
              { id: 4, name: deputyStratName || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ', rawName: deputyStratName, division: 'ฝ่ายแผนงานและความร่วมมือ', position: deputyStratPosition || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ' },
              { id: 3, name: deputyDevName || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา', rawName: deputyDevName, division: 'ฝ่ายพัฒนากิจการนักเรียนฯ', position: deputyDevPosition || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียนฯ' },
              { id: 1, name: deputyAcadName || 'รองผู้อำนวยการฝ่ายวิชาการ', rawName: deputyAcadName, division: 'ฝ่ายวิชาการ', position: deputyAcadPosition || 'รองผู้อำนวยการฝ่ายวิชาการ' },
            ];
        const deputyList = dynamicDeputies.filter((d: any) => !!d.name);

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                รองผู้อำนวยการ ๔ ฝ่าย
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <select
              value={value || ''}
              onChange={(e) => {
                const selectedVal = e.target.value;
                const selected = deputyList.find(d => d.name === selectedVal);
                setDynamicData(prev => {
                  const next: Record<string, any> = { ...prev, [key]: selectedVal };
                  if (selected) {
                    next['approver_position'] = selected.position;
                    next['approver_name_position'] = selected.position;
                    next[`${key}_position`] = selected.position;
                    next['deputy_position'] = selected.position;
                    template?.tags?.forEach((t: any) => {
                      if (
                        t.tag_type === 'APPROVER_POSITION' ||
                        t.tag_type === 'DEPUTY_POSITION' ||
                        t.tag_name === 'approver_position' ||
                        t.tag_name === 'approver_name_position' ||
                        t.tag_name === 'deputy_position' ||
                        t.tag_name === `${key}_position` ||
                        (t.tag_name.includes('approver') && t.tag_name.includes('pos'))
                      ) {
                        next[t.tag_name] = selected.position;
                      }
                    });
                  }
                  return next;
                });
              }}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- เลือกรองผู้อำนวยการประจำฝ่าย --</option>
              {deputyList.map((d, i) => (
                <option key={i} value={d.name}>
                  {d.name} ({d.division})
                </option>
              ))}
            </select>
          </div>
        );
      }
      case 'HEAD_DROPDOWN': {
        const allDepts = (typeof divisionsData !== 'undefined' ? divisionsData : []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []);
        const headList = allDepts.filter((d: any) => !!d.head_name);

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                หัวหน้างาน / หัวหน้าแผนก
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <select
              value={value || ''}
              onChange={(e) => {
                const selectedVal = e.target.value;
                const selected = headList.find((d: any) => d.head_name === e.target.value);
                setDynamicData(prev => {
                  const next: Record<string, any> = { ...prev, [key]: selectedVal };
                  if (selected) {
                    const pos = selected.head_position || `หัวหน้า${selected.name}`;
                    next['head_position'] = pos;
                    next[`${key}_position`] = pos;
                    template?.tags?.forEach((t: any) => {
                      if (
                        t.tag_type === 'HEAD_POSITION' ||
                        t.tag_name === 'head_position' ||
                        t.tag_name === `${key}_position`
                      ) {
                        next[t.tag_name] = pos;
                      }
                    });
                  }
                  return next;
                });
              }}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- เลือกหัวหน้างาน / หัวหน้าแผนก --</option>
              {headList.map((d: any, i: number) => (
                <option key={i} value={d.head_name}>
                  {d.head_name} ({d.name})
                </option>
              ))}
            </select>
          </div>
        );
      }
      case 'APPROVER_DROPDOWN': {
        const dynamicDeputies = (typeof divisionsData !== 'undefined' && divisionsData?.length > 0)
          ? divisionsData.map((div: any) => ({
              id: div.id,
              name: div.deputy_name || `รองผู้อำนวยการ${div.name}`,
              rawName: div.deputy_name || '',
              division: div.name,
              code: div.code,
              position: div.deputy_position || `รองผู้อำนวยการ${div.name}`,
            }))
          : [
              { id: 2, name: deputyResName || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร', rawName: deputyResName, division: 'ฝ่ายบริหารทรัพยากร', position: deputyResPosition || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร' },
              { id: 4, name: deputyStratName || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ', rawName: deputyStratName, division: 'ฝ่ายแผนงานและความร่วมมือ', position: deputyStratPosition || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ' },
              { id: 3, name: deputyDevName || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา', rawName: deputyDevName, division: 'ฝ่ายพัฒนากิจการนักเรียนฯ', position: deputyDevPosition || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียนฯ' },
              { id: 1, name: deputyAcadName || 'รองผู้อำนวยการฝ่ายวิชาการ', rawName: deputyAcadName, division: 'ฝ่ายวิชาการ', position: deputyAcadPosition || 'รองผู้อำนวยการฝ่ายวิชาการ' },
            ];
        const deputyList = dynamicDeputies;

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                ผู้เห็นชอบโครงการ (รองฝ่าย)
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <div className="space-y-1.5">
              <select
                value={value || ''}
                onChange={(e) => {
                  const selectedVal = e.target.value;
                  const selectedDeputy = deputyList.find(d => d.name === selectedVal || d.rawName === selectedVal);
                  setDynamicData(prev => {
                    const next: Record<string, any> = { ...prev, [key]: selectedVal };
                    if (selectedDeputy) {
                      next['approver_position'] = selectedDeputy.position;
                      next['approver_name_position'] = selectedDeputy.position;
                      next[`${key}_position`] = selectedDeputy.position;
                      next['deputy_position'] = selectedDeputy.position;
                      template?.tags?.forEach((t: any) => {
                        if (
                          t.tag_type === 'APPROVER_POSITION' ||
                          t.tag_type === 'DEPUTY_POSITION' ||
                          t.tag_name === 'approver_position' ||
                          t.tag_name === 'approver_name_position' ||
                          t.tag_name === 'deputy_position' ||
                          t.tag_name === `${key}_position` ||
                          (t.tag_name.includes('approver') && t.tag_name.includes('pos'))
                        ) {
                          next[t.tag_name] = selectedDeputy.position;
                        }
                      });
                    }
                    return next;
                  });
                }}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white"
              >
                <option value="">-- เลือกผู้เห็นชอบโครงการ (รองผู้อำนวยการฝ่าย) --</option>
                {deputyList.map((d, i) => (
                  <option key={`dep-${i}`} value={d.rawName || d.name}>
                    {d.rawName ? `${d.rawName} (${d.division})` : `${d.name} (${d.division})`}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => handleDynamicChange(key, e.target.value)}
                placeholder="ชื่อ-นามสกุล ผู้เห็นชอบโครงการ (สามารถพิมพ์หรือแก้ไขได้)..."
                required={tag.is_required}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>
        );
      }
      case 'LEADER_POSITION': {
        const standardBasePositions = [
          { label: 'หัวหน้างาน', prefix: 'หัวหน้า' },
          { label: 'ผู้ช่วยงาน', prefix: 'ผู้ช่วย' },
          { label: 'ครูประจำแผนก / สาขาวิชา', prefix: 'ครูประจำ' },
          { label: 'หัวหน้าแผนกวิชา / หัวหน้าสาขา', prefix: 'หัวหน้า' },
          { label: 'เจ้าหน้าที่', prefix: 'เจ้าหน้าที่' },
        ];

        const allDivisions = typeof divisionsData !== 'undefined' ? divisionsData : [];
        const userDeptName = user?.department?.name || '';

        const buildPositionTitle = (baseRole: string, dept: string) => {
          if (!dept) return baseRole;
          if (!baseRole) return dept;

          if (baseRole === 'หัวหน้างาน') {
            return dept.startsWith('งาน') ? `หัวหน้า${dept}` : `หัวหน้างาน${dept}`;
          }
          if (baseRole === 'ผู้ช่วยงาน') {
            return dept.startsWith('งาน') ? `ผู้ช่วย${dept}` : `ผู้ช่วยงาน${dept}`;
          }
          if (baseRole === 'ครูประจำแผนก / สาขาวิชา' || baseRole === 'ครูประจำแผนก') {
            return dept.startsWith('แผนก') ? `ครูประจำ${dept}` : (dept.startsWith('งาน') ? `ครูประจำ${dept}` : `ครูประจำแผนกวิชา${dept}`);
          }
          if (baseRole === 'หัวหน้าแผนกวิชา / หัวหน้าสาขา' || baseRole === 'หัวหน้าแผนกวิชา') {
            return dept.startsWith('แผนก') ? `หัวหน้า${dept}` : `หัวหน้าแผนกวิชา${dept}`;
          }
          if (baseRole === 'เจ้าหน้าที่') {
            return dept.startsWith('งาน') || dept.startsWith('แผนก') ? `เจ้าหน้าที่${dept}` : `เจ้าหน้าที่งาน${dept}`;
          }
          return `${baseRole}${dept}`;
        };

        return (
          <div key={key} className="col-span-1 lg:col-span-2 bg-indigo-50/30 p-3.5 rounded-lg border border-indigo-100/80">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
              <label className="block text-sm font-semibold text-gray-800">
                {label} {tag.is_required && <span className="text-red-500">*</span>}
              </label>
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full border border-indigo-200">
                ตำแหน่งของผู้รับผิดชอบ / ผู้เสนอโครงการ
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-2">{tag.description}</p>}

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">เลือกตำแหน่งหลัก:</label>
                  <select
                    disabled={!isEditing}
                    onChange={(e) => {
                      const base = e.target.value;
                      if (!base) return;
                      const currentVal = value || '';
                      let currentDept = '';
                      for (const div of allDivisions) {
                        for (const d of div.departments || []) {
                          if (currentVal.includes(d.name)) {
                            currentDept = d.name;
                            break;
                          }
                        }
                        if (currentDept) break;
                      }
                      const deptToUse = currentDept || userDeptName;
                      const formatted = buildPositionTitle(base, deptToUse);
                      handleDynamicChange(key, formatted);
                    }}
                    className="w-full text-xs rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1.5"
                    defaultValue=""
                  >
                    <option value="">-- เลือกตำแหน่งหลักเพื่อรวมข้อความ --</option>
                    {standardBasePositions.map((pos) => (
                      <option key={pos.label} value={pos.label}>{pos.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ใส่งานในฝ่าย / สาขาวิชา / แผนกวิชา:</label>
                  <select
                    disabled={!isEditing}
                    onChange={(e) => {
                      const selectedDeptName = e.target.value;
                      if (!selectedDeptName) return;
                      const currentVal = value || '';
                      let currentBase = '';
                      if (currentVal.startsWith('หัวหน้า')) currentBase = 'หัวหน้างาน';
                      else if (currentVal.startsWith('ผู้ช่วย')) currentBase = 'ผู้ช่วยงาน';
                      else if (currentVal.startsWith('ครูประจำ')) currentBase = 'ครูประจำแผนก';
                      else if (currentVal.startsWith('เจ้าหน้าที่')) currentBase = 'เจ้าหน้าที่';
                      else currentBase = user?.position || 'ครู';

                      const formatted = buildPositionTitle(currentBase, selectedDeptName);
                      handleDynamicChange(key, formatted);
                    }}
                    className="w-full text-xs rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1.5"
                    defaultValue=""
                  >
                    <option value="">-- เลือกงานในฝ่าย / สาขาวิชา --</option>
                    {allDivisions.map((div: any) => (
                      <optgroup key={div.id} label={div.name}>
                        {(div.departments || []).map((dept: any) => (
                          <option key={dept.id} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ข้อความตำแหน่งเต็ม (สามารถพิมพ์ระบุหรือแก้ไขเพิ่มเติมได้เอง):
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => handleDynamicChange(key, e.target.value)}
                    placeholder="เช่น หัวหน้างานวางแผนและงบประมาณ, ครูประจำแผนกวิชาช่างยนต์, เจ้าหน้าที่งานการเงิน"
                    required={tag.is_required}
                    disabled={!isEditing}
                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm font-medium text-gray-900 bg-white px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'APPROVER_POSITION': {
        return (
          <div key={key} className="col-span-1">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                ดึงอัตโนมัติตามรองฝ่าย
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              placeholder="ระบบจะดึงอัตโนมัติตามรองฝ่ายที่เลือก"
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-purple-50/30 font-medium text-purple-950 focus:bg-white"
            />
          </div>
        );
      }
      case 'PLANNING_HEAD_NAME':
      case 'PLANNING_HEAD_POSITION': {
        return (
          <div key={key} className="col-span-1">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                ดึงอัตโนมัติ (งานแผน)
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-blue-50/20 font-medium text-blue-950 focus:bg-white"
            />
          </div>
        );
      }
      case 'APPROVER_POSITION_DROPDOWN': {
        const standardPositions = [
          'หัวหน้างาน',
          'ผู้ช่วยงาน',
          'ครูประจำแผนก',
          'เจ้าหน้าที่',
        ];

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                ตำแหน่งผู้เห็นชอบ
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- เลือกตำแหน่งผู้เห็นชอบโครงการ --</option>
              {standardPositions.map((pos, i) => (
                <option key={i} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        );
      }
      case 'LEADER_NAME':
      case 'HEAD_NAME':
      case 'HEAD_POSITION':
      case 'DIRECTOR_NAME':
      case 'DIRECTOR_POSITION':
      case 'COLLEGE_NAME':
      case 'DEPUTY_ACAD_NAME':
      case 'DEPUTY_ACAD_POSITION':
      case 'DEPUTY_RES_NAME':
      case 'DEPUTY_RES_POSITION':
      case 'DEPUTY_DEV_NAME':
      case 'DEPUTY_DEV_POSITION':
      case 'DEPUTY_STRAT_NAME':
      case 'DEPUTY_STRAT_POSITION':
        return (
          <div key={key} className="col-span-1">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                ดึงอัตโนมัติ
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50/50 focus:bg-white"
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
